import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, Application } from 'express';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('TypeScript with Express server is running perfectly!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
