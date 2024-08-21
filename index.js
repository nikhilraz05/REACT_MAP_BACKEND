import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { config } from 'dotenv';
import axios from 'axios';
import cors from 'cors';

config(); // Load environment variables

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Adjust this according to your frontend URL
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const ORS_API_KEY = process.env.REACT_APP_API_KEY;

app.use(cors());
app.use(express.json());

app.post('/directions', async (req, res) => {
  const { start, end } = req.body;

  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end locations are required' });
  }

  try {
    const startCoords = await getCoordinates(start);
    const endCoords = await getCoordinates(end);

    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car',
      { coordinates: [startCoords, endCoords] },
      {
        headers: {
          Authorization: `Bearer ${ORS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const coordinates = response.data.routes[0].geometry;

    res.json({ coordinates });
  } catch (error) {
    console.error('Error fetching route:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch route', details: error.message });
  }
});

const getCoordinates = async (location) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        format: 'json',
        q: location
      }
    });

    const data = response.data;
    if (data.length > 0) {
      const { lon, lat } = data[0];
      return [parseFloat(lon), parseFloat(lat)];
    } else {
      throw new Error('Location not found');
    }
  } catch (error) {
    console.error('Error fetching coordinates:', error.message);
    throw error;
  }
};

// Mock real-time location updates
let currentIndex = 0;
let coordinates = [];

app.post('/start-bike', (req, res) => {
  coordinates = req.body.coordinates;
  currentIndex = 0;
  res.status(200).json({ message: 'Bike started' });
});

io.on('connection', (socket) => {
  console.log('New client connected');

  const sendLocationUpdate = () => {
    if (coordinates.length > 0 && currentIndex < coordinates.length) {
      const [lon, lat] = coordinates[currentIndex];
      socket.emit('bikeLocationUpdate', { lat, lon });
      currentIndex++;
    } else {
      clearInterval(interval);
    }
  };

  const interval = setInterval(sendLocationUpdate, 1000); // Update every second

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
