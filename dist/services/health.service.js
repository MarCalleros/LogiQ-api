export const healthService = {
    getStatus() {
        return {
            status: "ok",
            timestamp: new Date().toISOString(),
        };
    },
};
