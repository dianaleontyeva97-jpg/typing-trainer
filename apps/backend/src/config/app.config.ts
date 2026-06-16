export default () => ({
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  mail: {
    resendApiKey: process.env.RESEND_API_KEY,
  },
  app: {
    url: process.env.APP_URL || 'http://localhost:3000',
  },
});