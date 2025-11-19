# pick any RPC from https://chainlist.org/chain/1
[ -z "${ETH_RPC_URL:-}" ] && ETH_RPC_URL=https://ethereum-rpc.publicnode.com

# alias for Foundry's "cast" command (https://getfoundry.sh/cast/overview)
castcall() {
    cast call --rpc-url $ETH_RPC_URL "$@"
}

# hex_to_dec - convert a 0x-prefixed or plain hex string to decimal using bc/dc; fall back to python3 if available
hex_to_dec() {
    local hex=${1#0x}
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "print(int('$hex', 16))"
        return
    fi
    hex=${hex^^}
    if command -v bc >/dev/null 2>&1; then
        printf 'ibase=16;%s\n' "$hex" | bc | tr -d '\\\n'
        return
    elif command -v dc >/dev/null 2>&1; then
        printf '16i %s p\n' "$hex" | dc | tr -d '\\\n'
        return
    fi
    printf '0'
    return 1
}

# abi_decode - Generic Ethereum ABI decoder helper
# Modes:
#   uint        -> decimal (safe big-int via bc/dc; falls back to python3)
#   word        -> first 32-byte word as 0x<64-hex>
#   str         -> ABI dynamic string (UTF-8)
#   u256[]      -> prints each element of uint256[] as 0x<64-hex> on its own line
abi_decode() {
    local hex=${1#0x}
    local mode=${2:-str}

    # --- word: exact first 32 bytes as hex (keeps leading zeros) ---
    if [[ $mode == "word" ]]; then
        [[ ${#hex} -lt 64 ]] && { printf ""; return; }
        printf '0x%s' "${hex:0:64}"
        return
    fi

    # --- uint: interpret first 32 bytes as unsigned integer (big-int safe) ---
    if [[ $mode == "uint" ]]; then
        local w=${hex:0:64}
        [[ ${#w} -lt 64 ]] && { printf "0"; return; }
        printf '%s' "$(hex_to_dec "$w")"
        return
    fi

    # --- dynamic head parse shared by str/u256[] ---
    local word0=${hex:0:64}
    [[ -z $word0 || ${#word0} -lt 64 ]] && { printf ""; return; }
    local w0=$((16#$word0))
    local total_hex_len=${#hex}
    local len data_start

    if (( w0 >= 32 )) && (( w0*2 + 64 <= total_hex_len )); then
        local off_bytes=$w0
        local off_hex_index=$((off_bytes * 2))
        local len_hex=${hex:off_hex_index:64}
        [[ -z $len_hex || ${#len_hex} -lt 64 ]] && { printf ""; return; }
        len=$((16#$len_hex))
        data_start=$((off_bytes * 2 + 64))
    else
        len=$w0
        data_start=64
    fi

    if [[ $mode == "str" ]]; then
        local data_chars=$((len * 2))
        (( data_start + data_chars > total_hex_len )) && {
            data_chars=$(( total_hex_len - data_start ))
            (( data_chars < 0 )) && data_chars=0
        }
        printf '%s' "${hex:data_start:data_chars}" | xxd -r -p | iconv -f utf-8 -t utf-8
        return
    fi

    if [[ $mode == "u256[]" || $mode == "uint256[]" ]]; then
        # len elements; each one word (32 bytes)
        local need_chars=$((len * 64))
        (( data_start + need_chars > total_hex_len )) && {
            need_chars=$(( total_hex_len - data_start ))
            (( need_chars < 0 )) && need_chars=0
        }
        local pos=$data_start
        local i
        for (( i=0; i<len; i++ )); do
            local word=${hex:pos:64}
            [[ ${#word} -lt 64 ]] && break
            printf '0x%s\n' "$word"
            pos=$((pos + 64))
        done
        return
    fi

    printf ""
}

# help: usage text for tf_getparcel
tf_getparcel_help() {
    cat <<'EOF'
Usage: tf_getparcel TOKEN_ID [options]
    -m|--method NAME   tokenHTML (animated; default) or tokenSVG (static)
    -v|--version IDX   render index; uses on-chain tokenURIAddresses[IDX]; if omitted, auto-detect per token
    -e|--seed   N      seed   (default 10196)
    -d|--decay  N      decay  (default 0; doesn't affect V2 due to internal override in the contract)
    -s|--status N      override status; if omitted, live-fetch
                       0: Terrain (default visual presentation)
                       1: Daydream (blank token users can paint)
                       2: Terraformed (token with user-supplied visuals)
                       3: OriginDaydream (daydream token dreaming on mint)
                       4: OriginTerraformed (terraformed OriginDaydream token)
    -c|--canvas CSV    override canvas; CSV of 32-byte words (0x + 64 hex) or raw hex string (1024 chars); if omitted, live-fetch 16 rows
    -o|--output FILE   write HTML/SVG to file (default: TOKEN_ID.html; '-' for stdout)
    -n|--dry-run       resolve inputs and print them; no render call
    --show-canvas      with --dry-run, print full canvas rows
    --canvas-hex       emit canvas JSON as hex strings
EOF
}

# tf_getparcel - fetch tokenHTML (HTML) or tokenSVG (inline-SVG)
# Rendering contract address is resolved from on-chain tokenURIAddresses.
# If --version (index) is provided, uses tokenURIAddresses[index].
# Otherwise, uses tokenToURIAddressIndex[tokenId] to pick the default.
# NOTE: Mapping reads (placement/status/canvas) ALWAYS call 0x4e1f41613c9084fdb9e34e11fae9412427480e56
tf_getparcel() {
    local id seed=10196 decay=0 version= \
          method="tokenHTML" \
          output= \
          dry_run=0 show_canvas=0

    # Default: canvas as DECIMALS for `cast` (you can force hex with --canvas-hex)
    local canvas_dec=1

    # Track if version was explicitly provided
    local version_set=0

    # Explicit overrides
    local status="" status_set=0
    local canvas_str="" canvas_set=0

    # ---------- option parsing ----------
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--seed)      seed=$2;    shift 2 ;;
            -d|--decay)     decay=$2;   shift 2 ;;
            -m|--method)    method=$2;  shift 2 ;;
            -v|--version)   version=$2; version_set=1; shift 2 ;;
            -s|--status)    status=$2;  status_set=1; shift 2 ;;
            -c|--canvas)    canvas_str=$2; canvas_set=1; shift 2 ;;
            -o|--output)    output=$2;  shift 2 ;;
            -n|--dry-run)   dry_run=1;  shift 1 ;;
            --show-canvas)  show_canvas=1; shift 1 ;;
            --canvas-hex)   canvas_dec=0; shift 1 ;;
            -h|--help)
                tf_getparcel_help
                return ;;
            *)  [[ -z $id ]] && { id=$1; shift; } || { echo "Unexpected arg: $1" >&2; return 1; } ;;
        esac
    done
    [[ -z $id ]] && { echo "TOKEN_ID is required" >&2; echo; tf_getparcel_help; return 1; }

    # ---------- addresses ----------
    local mapping_addr="0x4e1f41613c9084fdb9e34e11fae9412427480e56"

    # Resolve rendering contract address from on-chain storage/array
    local version_idx data_hex word_hex addr_word data_addr
    if [[ $version_set -eq 1 ]]; then
        version_idx=$version
    else
        # tokenToURIAddressIndex mapping is at slot 11128; index = storage[keccak256(pad32(tokenId) || pad32(11128))]
        local slot_tokenToURI=11128
        local map_key_hex map_slot idx_hex
        map_key_hex=$(printf "%064x%064x" "$id" "$slot_tokenToURI")
        map_slot=$(cast keccak 0x${map_key_hex})
        idx_hex=$(cast storage "$mapping_addr" "$map_slot" 2>/dev/null || true)
        version_idx=$(abi_decode "$idx_hex" uint)
        version=$version_idx
    fi
    data_hex=$(castcall "$mapping_addr" 'tokenURIAddresses(uint256)' "$version_idx" 2>/dev/null) || { echo "Invalid version index: $version_idx" >&2; return 1; }
    word_hex=$(abi_decode "$data_hex" word)
    addr_word=${word_hex#0x}
    data_addr="0x${addr_word: -40}"
    data_addr=${data_addr,,}

    # ---------- derive placement (from mapping_addr) ----------
    local placement_hex placement
    placement_hex=$(castcall "$mapping_addr" 'tokenToPlacement(uint256)' "$id")
    placement=$(abi_decode "$placement_hex" uint)

    # ---------- derive status if not explicitly provided (from mapping_addr) ----------
    if [[ $status_set -eq 0 ]]; then
        local status_hex
        status_hex=$(castcall "$mapping_addr" 'tokenToStatus(uint256)' "$id")
        status=$(abi_decode "$status_hex" uint)   # enum -> uint
    fi

    # ---------- derive canvas if not explicitly provided (from mapping_addr, 16 rows) ----------
    local -a canvas_arr=()
    if [[ $canvas_set -eq 0 ]]; then
        local i row_hex word_hex
        # If status is 0, the contract resolves the internal canvas; avoid lookups and pass zeros
        if [[ $status =~ ^[0-9]+$ ]] && (( status == 0 )); then
            for (( i=0; i<16; i++ )); do
                canvas_arr+=("0000000000000000000000000000000000000000000000000000000000000000")
                if [[ $dry_run -eq 1 && $show_canvas -eq 1 ]]; then
                    echo "  [debug] canvas[$i] = 0"
                fi
            done
        else
            for (( i=0; i<16; i++ )); do
                # Suppress revert noise; treat missing/empty rows as zero
                row_hex=$(castcall "$mapping_addr" 'tokenToCanvasData(uint256,uint256)' "$id" "$i" 2>/dev/null) || row_hex=""
                if [[ -n $row_hex ]]; then
                    word_hex=$(abi_decode "$row_hex" word)   # 0x + 64 hex chars (uint256)
                else
                    word_hex=""
                fi
                if [[ -z $word_hex ]]; then
                    canvas_arr+=("0000000000000000000000000000000000000000000000000000000000000000")
                    if [[ $dry_run -eq 1 && $show_canvas -eq 1 ]]; then
                        echo "  [debug] canvas[$i] = 0"
                    fi
                    continue
                fi
                canvas_arr+=("${word_hex#0x}")
                if [[ $dry_run -eq 1 && $show_canvas -eq 1 ]]; then
                    echo "  [debug] canvas[$i] = $word_hex"
                fi
            done
        fi
    else
        # If canvas_str contains no commas and is long, treat as raw decimal digit string
        # Strip whitespace first (newlines, spaces)
        local clean_canvas
        clean_canvas=$(printf "%s" "$canvas_str" | tr -d '[:space:]')

        if [[ "$clean_canvas" != *","* && ${#clean_canvas} -gt 64 ]]; then
            # Split into 64-character chunks (digits) and convert to hex words
            # The contract expects 16 uint256s. Each uint256 represents 64 decimal digits.
            local remaining="$clean_canvas"
            local chunk_count=0
            
            while [[ ${#remaining} -gt 0 && $chunk_count -lt 16 ]]; do
                local chunk="${remaining:0:64}"
                remaining="${remaining:64}"
                chunk_count=$((chunk_count + 1))
                
                # Convert decimal string chunk to hex
                local hex_val=""
                if command -v python3 >/dev/null 2>&1; then
                    hex_val=$(python3 -c "print(hex(int('$chunk'))[2:])")
                elif command -v bc >/dev/null 2>&1; then
                    hex_val=$(echo "obase=16; $chunk" | bc | tr -d '\\\n')
                fi
                
                # Left-pad with zeros to 64 hex chars (32 bytes)
                # Note: abi_decode expects 64 chars.
                while [[ ${#hex_val} -lt 64 ]]; do
                    hex_val="0${hex_val}"
                done
                
                canvas_arr+=("$hex_val")
            done
            
            # Pad with zeros if fewer than 16 chunks
            while [[ ${#canvas_arr[@]} -lt 16 ]]; do
                canvas_arr+=("0000000000000000000000000000000000000000000000000000000000000000")
            done
        else
            IFS=',' read -r -a canvas_arr <<< "$canvas_str"
            # Ensure elements are clean hex (strip 0x if present for consistency in array, though loop handles it)
            local j
            for j in "${!canvas_arr[@]}"; do
                local val="${canvas_arr[$j]}"
                val="${val#0x}"
                # Pad to 64 chars if it looks like hex and is short? 
                # Assuming user provides valid 32-byte words if using commas.
                # But let's ensure padding for abi_decode safety
                while [[ ${#val} -lt 64 ]]; do
                    val="0${val}"
                done
                canvas_arr[$j]="$val"
            done
        fi
    fi

    # ---------- build canvas JSON ----------
    # Default: decimals (for cast). Hex can be forced via --canvas-hex.
    local canvas_json="["
    local i elem elem_dec
    for i in "${!canvas_arr[@]}"; do
        elem="${canvas_arr[$i]}"
        # elem is now raw hex string (no 0x prefix)
        if (( canvas_dec == 1 )); then
            # Convert hex to decimal
            # abi_decode expects 0x prefix or just hex? 
            # Our abi_decode implementation: local hex=${1#0x} -> handles both.
            elem_dec=$(abi_decode "0x$elem" uint)
            canvas_json+="$elem_dec"
        else
            canvas_json+="\"0x$elem\""
        fi
        [[ $i -lt $((${#canvas_arr[@]}-1)) ]] && canvas_json+="," 
    done
    canvas_json+="]"

    # ---------- selector ----------
    local selector
    case $method in
        tokenHTML) selector='tokenHTML(uint256,uint256,uint256,uint256,uint256[])' ;;
        tokenSVG)  selector='tokenSVG(uint256,uint256,uint256,uint256,uint256[])' ;;
        *) echo "Unknown method: $method"; return 1 ;;
    esac

    # ---------- filename slugs (version, status) ----------
    local version_slug="v${version}"
    local status_slug
    case "$status" in
        0) status_slug="terrain" ;;
        1) status_slug="daydream" ;;
        2) status_slug="terraformed" ;;
        3) status_slug="od" ;;
        4) status_slug="ot" ;;
        *) status_slug="unknown" ;;
    esac

    # ---------- dry-run debug print ----------
    if [[ $dry_run -eq 1 ]]; then
        echo "tf_getparcel dry-run:"
        echo "  token_id        : $id"
        echo "  version         : $version"
        echo "  mapping_addr    : $mapping_addr"
        echo "  data_addr       : $data_addr"
        echo "  placement       : $placement"
        echo "  status          : $status_slug ($status)   ($([[ $status_set -eq 1 ]] && echo override || echo live))"
        echo "  canvas_len      : ${#canvas_arr[@]} (format: $([[ $canvas_dec -eq 1 ]] && echo decimal || echo hex))"
        if [[ $show_canvas -eq 1 && ${#canvas_arr[@]} -gt 0 ]]; then
            echo "  canvas (full):"
            for elem in "${canvas_arr[@]}"; do echo "    $elem"; done
        else
            local preview_cnt=${#canvas_arr[@]}
            (( preview_cnt > 4 )) && preview_cnt=4
            if (( preview_cnt > 0 )); then
                echo -n "  canvas preview  : "
                for (( i=0; i<preview_cnt; i++ )); do
                    printf "%s%s" "${canvas_arr[$i]}" $([[ $i -lt $((preview_cnt-1)) ]] && echo "," || echo "")
                done
                echo
            fi
        fi
        echo "  selector        : $selector"
        echo "  seed, decay     : $seed, $decay"
        [[ -z $output ]] && output="${id}-${version_slug}-${status_slug}.html"
        echo "  output          : $output"
        echo "  canvas_json     : ${canvas_json}"
        return
    fi

    # ---------- fetch, decode ----------
    local raw_hex raw
    raw_hex=$(castcall "$data_addr" "$selector" "$status" "$placement" "$seed" "$decay" "$canvas_json")
    raw=$(abi_decode "$raw_hex" str)

    # ---------- output (default to ${id}.html) ----------
    [[ -z $output ]] && output="${id}-${version_slug}-${status_slug}.html"
    if [[ "$output" == "-" ]]; then
        printf '%s' "$raw"
    else
        printf '%s' "$raw" > "$output"
        echo "Saved to: $output"
    fi
}
