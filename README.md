cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev

Authentication Endpoints
POST /api/auth/register - User registration

POST /api/auth/login - User login with CAPTCHA

POST /api/auth/logout - User logout

POST /api/auth/refresh-token - Refresh JWT token

GET /api/auth/captcha - Generate CAPTCHA

User Endpoints
GET /api/users/downline - Get user downline hierarchy

POST /api/users/create-user - Create next-level user

PUT /api/users/change-password - Change downline user password

GET /api/users/all - Get all users (Admin only)

Balance Endpoints
POST /api/balance/credit - Transfer balance to downline

POST /api/balance/recharge - Self recharge (Owner only)

GET /api/balance/transactions - Get transaction history

GET /api/balance/summary - Get balance summary
