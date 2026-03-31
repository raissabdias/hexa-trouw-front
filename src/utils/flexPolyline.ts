/**
 * Standalone HERE Flexible Polyline Decoder
 * Based on the official HERE implementation: https://github.com/heremaps/flexible-polyline
 */

const DECODING_TABLE = [
    62, -1, -1, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, -1, -1, -1, -1, 63, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
];

const FORMAT_VERSION = 1;

function decodeChar(char: string) {
    const charCode = char.charCodeAt(0);
    return DECODING_TABLE[charCode - 45];
}

function decodeUnsignedValues(encoded: string) {
    let result = 0n;
    let shift = 0n;
    const resList: bigint[] = [];

    for (let i = 0; i < encoded.length; i++) {
        const char = encoded[i];
        const value = BigInt(decodeChar(char));
        result |= (value & 0x1Fn) << shift;
        if ((value & 0x20n) === 0n) {
            resList.push(result);
            result = 0n;
            shift = 0n;
        } else {
            shift += 5n;
        }
    }

    if (shift > 0n) {
        throw new Error('Invalid encoding');
    }

    return resList;
}

function decodeHeader(version: bigint, encodedHeader: bigint) {
    if (Number(version) !== FORMAT_VERSION) {
        throw new Error('Invalid format version');
    }
    const headerNumber = Number(encodedHeader);
    const precision = headerNumber & 15;
    const thirdDim = (headerNumber >> 4) & 7;
    const thirdDimPrecision = (headerNumber >> 7) & 15;
    return { precision, thirdDim, thirdDimPrecision };
}

function toSigned(val: bigint) {
    let res = val;
    if (res & 1n) {
        res = ~res;
    }
    res >>= 1n;
    return Number(res);
}

export function decodeFlexPolyline(encoded: string) {
    const decoder = decodeUnsignedValues(encoded);
    if (decoder.length < 2) throw new Error('Invalid polyline encoding');

    const header = decodeHeader(decoder[0], decoder[1]);

    const factorDegree = 10 ** header.precision;
    const factorZ = 10 ** header.thirdDimPrecision;
    const { thirdDim } = header;

    let lastLat = 0;
    let lastLng = 0;
    let lastZ = 0;
    const res: [number, number][] | [number, number, number][] = [];

    let i = 2;
    for (; i < decoder.length;) {
        const deltaLat = toSigned(decoder[i]) / factorDegree;
        const deltaLng = toSigned(decoder[i + 1]) / factorDegree;
        lastLat += deltaLat;
        lastLng += deltaLng;

        if (thirdDim) {
            const deltaZ = toSigned(decoder[i + 2]) / factorZ;
            lastZ += deltaZ;
            (res as [number, number, number][]).push([lastLat, lastLng, lastZ]);
            i += 3;
        } else {
            (res as [number, number][]).push([lastLat, lastLng]);
            i += 2;
        }
    }

    if (i !== decoder.length) {
        throw new Error('Invalid encoding. Premature ending reached');
    }

    return {
        ...header,
        polyline: res,
    };
}
