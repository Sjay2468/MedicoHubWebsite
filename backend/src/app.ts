import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/database';

dotenv.config();

// Connect to MongoDB Database
connectDB();

const app: Express = express();

// SECURITY: Hide that we are using Express to make it harder for hackers to target the site.
app.disable('x-powered-by');

// SECURITY: Add extra safety headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// SECURITY: Rate Limiting
// This stops people from spamming the server. 
// It only allows 100 requests every 15 minutes from the same person.
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

const port = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:5174'];
app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Custom route for uploads to strict enforce headers
app.get('/uploads/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'public/uploads', filename);

    if (filename.includes('..')) {
        return res.status(400).send('Invalid filename');
    }

    res.sendFile(filePath, {
        headers: {
            'Content-Type': filename.endsWith('.pdf') ? 'application/pdf' : undefined,
            'Content-Disposition': filename.endsWith('.pdf') ? 'inline' : 'inline',
            'Access-Control-Allow-Origin': '*'
        }
    });
});

// Swagger Setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Medico V3 Admin API',
            version: '1.0.0',
            description: 'Backend API for Medico Hub V3',
        },
        servers: [
            {
                url: process.env.API_URL || `http://localhost:${port}`,
                description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Local Server'
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/modules/**/*.routes.ts'],
};

const specs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Basic Route
app.get('/', (req: Request, res: Response) => {
    res.send('Medico V3 Backend is Running');
});

// Import Modules
import userRoutes from './modules/user/user.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import resourceRoutesV3 from './modules/resources/resource.routes';
import analyticsRoutesV3 from './modules/analytics/analytics.v3.routes';
import productRoutes from './modules/products/product.routes';
import uploadRoutes from './modules/upload/upload.routes';
import couponRoutes from './modules/coupons/coupon.routes';
import deliveryRoutes from './modules/delivery/delivery.routes';
import orderRoutes from './modules/orders/order.routes';

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v3/resources', resourceRoutesV3);
app.use('/api/v3/analytics', analyticsRoutesV3);
app.use('/api/v3/products', productRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/orders', orderRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[Error] ${req.method} ${req.path}:`, err.message);
    }

    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'An internal server error occurred'
            : err.message
    });
});

app.listen(port, () => {
    console.log(`[server]: Medico V3 Backend Running on port ${port}`);
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[docs]: Swagger UI is available at http://localhost:${port}/api-docs`);
    }
});
