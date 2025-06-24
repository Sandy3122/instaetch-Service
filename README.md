# InstaFetch Backend - Secure Instagram Scraper MVP

A secure Node.js backend API for scraping public Instagram content (profiles, posts, reels, stories, highlights, etc.) following fastdl.app patterns.

## 🚀 Features

- **Secure Instagram Scraping**: Backend-only scraping with no exposure to frontend
- **Multiple Content Types**: Support for profiles, posts, reels, stories, highlights, IGTV, videos, carousels
- **Caching System**: Intelligent caching to reduce API calls and improve performance
- **Rate Limiting**: Configurable rate limiting to prevent abuse
- **Security**: CORS, Helmet, input validation, and other security measures
- **API Compatibility**: Follows fastdl.app API patterns for easy integration
- **Error Handling**: Comprehensive error handling and logging
- **Documentation**: Built-in API documentation endpoint
- **Cloudflare Support**: Cloudflare token generation for bypassing protection
- **Timestamp Services**: Millisecond timestamp generation for API compatibility

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Internet connection for Instagram scraping

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-here
   API_KEY_SECRET=your-api-key-secret-here
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Test the backend**
   ```bash
   # Simple test
   npm run test:simple
   
   # Full API test
   npm run test:api
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `JWT_SECRET` | JWT secret key | fallback-secret-key |
| `API_KEY_SECRET` | API key secret | fallback-api-secret |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `INSTAGRAM_TIMEOUT` | Instagram request timeout | 30000 |
| `CACHE_TTL` | Cache TTL in seconds | 3600 (1 hour) |
| `ALLOWED_ORIGINS` | CORS allowed origins | localhost URLs |

## 📚 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Authentication
Some endpoints require an API key in the header:
```
X-API-Key: your-api-key-secret
```

### Fastdl.app Compatible Endpoints

#### 1. Cloudflare Token Generation
```http
POST /cf
Content-Type: application/json

{
  "cfToken": "your-cloudflare-token"
}
```

**Response:**
```json
{
  "result": "d5a4dd139a81a8899bced447976e952db068a15cffda48d61fdacf539c90987d.1750579169808"
}
```

#### 2. Millisecond Timestamp
```http
GET /msec
```

**Response:**
```json
{
  "msec": 1750579024.431
}
```

### Instagram Scraping Endpoints

#### 3. Get User Information
```http
POST /v1/instagram/userInfo
Content-Type: application/json

{
  "username": "instagram"
}
```

**Response:**
```json
{
  "result": [{
    "user": {
      "id": "25025320",
      "username": "instagram",
      "full_name": "Instagram",
      "biography": "Discovering — and telling — stories from around the world.",
      "profile_pic_url": "https://...",
      "followers_count": 123456789,
      "following_count": 123,
      "media_count": 1234,
      "is_private": false,
      "is_verified": true
    },
    "status": "ok"
  }]
}
```

#### 4. Get User Posts
```http
POST /v1/instagram/postsV2
Content-Type: application/json

{
  "username": "instagram",
  "maxId": ""
}
```

#### 5. Convert Media (Posts, Reels, Videos)
```http
POST /convert
Content-Type: application/json

{
  "url": "https://www.instagram.com/p/ABC123/",
  "ts": 1640995200000
}
```

**Response:**
```json
{
  "url": [{
    "url": "https://media.instagram.com/...",
    "name": "MP4",
    "type": "mp4",
    "ext": "mp4"
  }],
  "meta": {
    "title": "Post caption",
    "source": "https://www.instagram.com/p/ABC123/",
    "shortcode": "ABC123",
    "comment_count": 10,
    "like_count": 100,
    "taken_at": 1640995200,
    "username": "instagram"
  },
  "thumb": "https://media.instagram.com/...",
  "hosting": "instagram.com",
  "timestamp": 1640995200
}
```

#### 6. Get Stories
```http
POST /v1/instagram/stories
Content-Type: application/json

{
  "username": "instagram"
}
```

#### 7. Get Highlights
```http
POST /v1/instagram/highlights
Content-Type: application/json

{
  "username": "instagram"
}
```

### Utility Endpoints

#### 8. Health Check
```http
GET /health
```

#### 9. Cache Management
```http
GET /cache/stats
DELETE /cache/clear
```

#### 10. API Documentation
```http
GET /docs
```

### Alternative GET Endpoints

For easier integration, the following GET endpoints are also available:

```http
GET /user/{username}
GET /user/{username}/posts?maxId={maxId}
GET /convert?url={url}&ts={timestamp}
```

## 🔒 Security Features

- **CORS Protection**: Configurable allowed origins
- **Rate Limiting**: API and scraping rate limits
- **Input Validation**: Comprehensive request validation
- **Security Headers**: Helmet.js for security headers
- **Request Logging**: Detailed request logging
- **Error Handling**: Secure error responses

## 💾 Caching

The backend implements intelligent caching with different TTLs:

- **User Info**: 30 minutes
- **Posts**: 15 minutes
- **Media Info**: 1 hour
- **Stories**: 5 minutes
- **Highlights**: 30 minutes

## 🧪 Testing

### Quick Test
```bash
npm run test:simple
```

### Full API Test
```bash
npm run test:api
```

### Manual Testing
```bash
# Start the server
npm run dev

# Test endpoints with curl
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/cf -H "Content-Type: application/json" -d '{"cfToken":"test"}'
curl http://localhost:3000/api/msec
```

## 📊 Monitoring

The backend includes built-in monitoring endpoints:

- **Health Check**: `/api/health`
- **Cache Statistics**: `/api/cache/stats`
- **API Documentation**: `/api/docs`

## 🚀 Deployment

### Production Setup
```bash
# Set environment variables
export NODE_ENV=production
export PORT=3000

# Install dependencies
npm install --production

# Start the server
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Development

### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   └── config.js
│   ├── controllers/
│   │   └── instagramController.js
│   ├── middleware/
│   │   └── security.js
│   ├── routes/
│   │   └── instagram.js
│   ├── utils/
│   │   ├── cache.js
│   │   └── instagram.js
│   └── server.js
├── test/
│   └── test-api.js
├── package.json
├── env.example
├── start.sh
└── README.md
```

### Adding New Endpoints

1. Add route in `src/routes/instagram.js`
2. Add controller method in `src/controllers/instagramController.js`
3. Add validation rules if needed
4. Update documentation in `src/server.js`
5. Add tests in `test/test-api.js`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This tool is for educational purposes only. Please respect Instagram's Terms of Service and rate limits. The authors are not responsible for any misuse of this tool.

## 🆘 Support

For support and questions:
- Check the API documentation at `/api/docs`
- Review the test files for usage examples
- Open an issue on GitHub

## 🔄 Updates

### Version 1.0.0
- Initial release with basic Instagram scraping
- Fastdl.app API compatibility
- Cloudflare token support
- Millisecond timestamp service
- Comprehensive caching system
- Security and rate limiting
- Full test suite 