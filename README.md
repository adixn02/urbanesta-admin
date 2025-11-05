# Urbanesta Admin Panel

Production-ready admin panel for Urbanesta Real Estate platform.

## 🏗️ Architecture

- **Backend**: Node.js + Express.js API (Port 3002)
- **Frontend**: Next.js 15 Admin Panel (Port 3000)
- **Database**: MongoDB Atlas
- **Storage**: AWS S3 + CloudFront
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx

## 📁 Project Structure

```
admin-pannel/
├── admin/          # Next.js frontend application
├── server/          # Express.js backend API
├── ecosystem.config.js  # PM2 configuration (root level)
└── .gitignore      # Git ignore rules
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- MongoDB Atlas account
- AWS S3 bucket configured
- PM2 (for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/adixn02/urbanesta-admin.git
   cd urbanesta-admin
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd server
   npm install
   
   # Frontend
   cd ../admin
   npm install
   ```

3. **Configure environment variables**
   
   Create `server/.env`:
   ```env
   NODE_ENV=development
   PORT=3002
   MONGODB_URL=your_mongodb_connection_string
   ALLOWED_ORIGINS=http://localhost:3000
   # ... other environment variables
   ```
   
   Create `admin/.env`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3002/api
   ```

4. **Run development servers**
   ```bash
   # Backend (Terminal 1)
   cd server
   npm run dev
   
   # Frontend (Terminal 2)
   cd admin
   npm run dev
   ```

## 📦 Production Deployment

See deployment guide for AWS Lightsail or other cloud providers.

### Using PM2

```bash
# Backend
cd server
pm2 start ecosystem.config.js --only urbanesta-admin-api

# Frontend (after building)
cd admin
npm run build
pm2 start ecosystem.config.js --only urbanesta-admin-frontend
```

## 🔒 Security

⚠️ **IMPORTANT**: Never commit `.env` files or environment files containing secrets. They are already in `.gitignore`.

## 📝 Environment Variables

### Backend (`server/.env`)

Required variables:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3002)
- `MONGODB_URL` - MongoDB connection string
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region
- `AWS_S3_BUCKET` - S3 bucket name
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh secret
- `SESSION_SECRET` - Session secret

### Frontend (`admin/.env`)

Required variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL

## 🛠️ Available Scripts

### Backend (`server/`)

- `npm run dev` - Start development server
- `npm run start` - Start production server
- `npm run pm2:start` - Start with PM2
- `npm run pm2:logs` - View PM2 logs

### Frontend (`admin/`)

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run pm2:start` - Start with PM2 (after build)

## 📚 Features

- User Management
- Property Management
- Builder Management
- Category Management
- City Management
- Lead Management
- Analytics Dashboard
- Activity Logs
- Two-Factor Authentication
- File Upload with S3/CloudFront

## 🔧 Tech Stack

### Backend
- Express.js 5.x
- MongoDB with Mongoose
- JWT Authentication
- AWS SDK for S3
- Helmet (Security)
- CORS
- Rate Limiting

### Frontend
- Next.js 15
- React 19
- Bootstrap 5
- Bootstrap Icons

## 📄 License

Proprietary - Urbanesta Real Estate

## 👥 Contributors

Urbanesta Development Team

---

For deployment instructions, see deployment documentation.

