declare const _default: () => {
    jwt: {
        accessSecret: string | undefined;
        refreshSecret: string | undefined;
        accessExpiresIn: string;
        refreshExpiresIn: string;
    };
    mail: {
        resendApiKey: string | undefined;
    };
    app: {
        url: string;
    };
};
export default _default;
