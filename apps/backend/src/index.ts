import express from 'express';
import cors from 'cors';
import tripsRouter from './routes/trips';

const app = express();
const PORT = process.env.PORT || 8080;
const API_VERSION = "v1";
const API_PREFIX = `/api/${API_VERSION}`;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'app backend is running my guy' 
    });
});

//other routes
app.use(`${API_PREFIX}/trips`, tripsRouter);


app.listen(PORT, () => {
  console.log(`Toursafe backend running on http://localhost:${PORT}`);
});