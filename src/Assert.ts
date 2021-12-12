export function ASSERT(text: string, condition: boolean) {
    if (!condition) {
        throw new Error(`assert error: ${text}`);
    }
}
