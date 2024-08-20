// backend/index.js
import express from 'express';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import cors from 'cors';
import axios from 'axios';


config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const ORS_API_KEY = process.env.REACT_APP_API_KEY;

app.post('/directions', async (req, res) => {
  const { start, end } = req.body;

  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end locations are required' });
  }

  try {
    const startCoords = await getCoordinates(start);
    const endCoords = await getCoordinates(end);
    console.log(startCoords,endCoords,"raj");

    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car',
      {
        coordinates: [startCoords, endCoords],
      },
      {
        headers: {
          Authorization: `Bearer ${ORS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract all latitude and longitude coordinates from the response
    const coordinates = response.data.routes[0].geometry;

    // Send the array of coordinates as the response
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
