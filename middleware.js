import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.js';

const extractToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send('Unauthorized: Invalid token');
      }

      req.user = decoded; // Attach the decoded payload to the request object
      next();
    });
  } else {
    return res.status(401).send('Unauthorized: No token provided');
  }
};

export default extractToken;
