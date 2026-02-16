const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize cache (6 hours)
const cache = new NodeCache({ stdTTL: 21600 });

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Budget Flight Finder API is running',
    api: 'SerpApi (Google Flights)',
    freeSearches: '100/month'
  });
});

// Get flight prices by month
app.get('/api/flights/price-calendar', async (req, res) => {
  try {
    const { origin, destination, tripDuration = 7 } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ 
        error: 'Missing required parameters: origin and destination' 
      });
    }

    const duration = parseInt(tripDuration);

    // Check cache
    const cacheKey = `calendar_${origin}_${destination}_${duration}d`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log('✅ Returning cached data');
      return res.json({ ...cachedData, cached: true });
    }

    console.log(`🔍 Fetching flight prices: ${origin} → ${destination} (${duration} days)`);

    if (!process.env.SERPAPI_KEY) {
      return res.status(500).json({
        error: 'API key not configured',
        message: 'Please add your SerpApi key to the .env file'
      });
    }

    // Get today's date and calculate future months
    const today = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Initialize monthly data for next 6 months only
    const monthlyPrices = {};
    for (let i = 0; i < 6; i++) {
      const monthIndex = (today.getMonth() + i) % 12;
      const monthName = monthNames[monthIndex];
      monthlyPrices[monthName] = {
        month: monthName,
        avgPrice: null,
        minPrice: null,
        maxPrice: null,
        flightCount: 0,
        prices: [],
        airlines: [],
        stops: []
      };
    }

    // Store all individual trips for finding cheapest specific dates
    const allTrips = [];

    // Search flights for multiple dates across the year
    const searchPromises = [];
    
    // OPTIMIZED: Search only 2 dates per month (1st, 15th) for 6 months ahead = 12 API calls total
    // This reduces from 48 calls to 12 calls (75% reduction!)
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      for (let dayOffset of [1, 15]) {
        const searchDate = new Date(today);
        searchDate.setMonth(today.getMonth() + monthOffset);
        searchDate.setDate(dayOffset);
        
        const outboundDate = searchDate.toISOString().split('T')[0];
        
        // Return date based on user's trip duration
        const returnDate = new Date(searchDate);
        returnDate.setDate(searchDate.getDate() + duration);
        const returnDateStr = returnDate.toISOString().split('T')[0];

        searchPromises.push(
          axios.get('https://serpapi.com/search', {
            params: {
              engine: 'google_flights',
              departure_id: origin,
              arrival_id: destination,
              outbound_date: outboundDate,
              return_date: returnDateStr,
              currency: 'USD',
              hl: 'en',
              api_key: process.env.SERPAPI_KEY
            }
          })
          .then(response => {
            // Debug: Log structure to understand Google Flights data
            if (response.data.best_flights?.[0]) {
              console.log(`📋 Sample flight structure for ${outboundDate}:`, JSON.stringify(response.data.best_flights[0], null, 2));
            }
            console.log(`✅ Got data for ${outboundDate}:`, response.data.best_flights?.length || 0, 'best flights');
            return { 
              monthOffset,
              outboundDate,
              returnDateStr,
              data: response.data,
              success: true 
            };
          })
          .catch(error => {
            console.error(`❌ Error fetching flights for ${outboundDate}:`, error.response?.data || error.message);
            return { 
              monthOffset,
              outboundDate,
              returnDateStr,
              data: null,
              success: false 
            };
          })
        );
      }
    }

    console.log(`📡 Making ${searchPromises.length} API calls to SerpApi...`);
    
    // Wait for all searches (with timeout)
    const results = await Promise.all(searchPromises);
    
    console.log(`📊 Received ${results.length} responses from SerpApi`);
    
    let totalFlights = 0;
    let successfulCalls = 0;

    // Process results
    results.forEach(({ monthOffset, outboundDate, returnDateStr, data, success }) => {
      if (success) {
        successfulCalls++;
      }
      
      if (success && data && data.best_flights) {
        const monthIndex = (today.getMonth() + monthOffset) % 12;
        const monthName = monthNames[monthIndex];
        
        // Get best flights
        data.best_flights.forEach(flight => {
          if (flight.price) {
            const price = Math.round(flight.price);
            const airline = flight.flights?.[0]?.airline || 'Unknown';
            const stops = flight.flights?.length - 1 || 0;
            
            monthlyPrices[monthName].prices.push(price);
            monthlyPrices[monthName].airlines.push(airline);
            monthlyPrices[monthName].stops.push(stops);
            monthlyPrices[monthName].flightCount++;
            totalFlights++;
            
            // Store individual trip data
            // Google Flights structure: flights array contains all segments
            // For round trips, we need to find the outbound and return legs
            const allSegments = flight.flights || [];
            const outboundDeparture = allSegments[0]?.departure_airport?.time || null;
            
            // Find the return flight (last segment's arrival time)
            const returnArrival = allSegments[allSegments.length - 1]?.arrival_airport?.time || null;
            
            allTrips.push({
              departureDate: outboundDate,
              returnDate: returnDateStr,
              price: price,
              airline: airline,
              duration: flight.total_duration,
              stops: stops,
              departureTime: outboundDeparture,
              arrivalTime: returnArrival,
              totalDuration: flight.total_duration || null
            });
          }
        });

        // Also check other flights (just top 3 for variety)
        if (data.other_flights) {
          data.other_flights.slice(0, 3).forEach(flight => {
            if (flight.price) {
              const price = Math.round(flight.price);
              const airline = flight.flights?.[0]?.airline || 'Unknown';
              const stops = flight.flights?.length - 1 || 0;
              
              monthlyPrices[monthName].prices.push(price);
              monthlyPrices[monthName].airlines.push(airline);
              monthlyPrices[monthName].stops.push(stops);
              monthlyPrices[monthName].flightCount++;
              totalFlights++;
              
              // Store individual trip data
              const allSegments = flight.flights || [];
              const outboundDeparture = allSegments[0]?.departure_airport?.time || null;
              const returnArrival = allSegments[allSegments.length - 1]?.arrival_airport?.time || null;
              
              allTrips.push({
                departureDate: outboundDate,
                returnDate: returnDateStr,
                price: price,
                airline: airline,
                duration: flight.total_duration,
                stops: stops,
                departureTime: outboundDeparture,
                arrivalTime: returnArrival,
                totalDuration: flight.total_duration || null
              });
            }
          });
        }
      }
    });

    console.log(`✅ API calls: ${successfulCalls}/${results.length} successful`);
    console.log(`✅ Found ${totalFlights} total flights across ${Object.keys(monthlyPrices).length} months`);

    // Calculate statistics for each month
    Object.values(monthlyPrices).forEach(month => {
      if (month.prices.length > 0) {
        month.avgPrice = Math.round(
          month.prices.reduce((a, b) => a + b, 0) / month.prices.length
        );
        month.minPrice = Math.min(...month.prices);
        month.maxPrice = Math.max(...month.prices);
        
        // Find most common airline for this month
        const airlineCounts = {};
        month.airlines.forEach(airline => {
          airlineCounts[airline] = (airlineCounts[airline] || 0) + 1;
        });
        month.topAirline = Object.keys(airlineCounts).reduce((a, b) => 
          airlineCounts[a] > airlineCounts[b] ? a : b, 'Various'
        );
        
        // Calculate percentage of nonstop flights
        const nonstopCount = month.stops.filter(s => s === 0).length;
        month.nonstopPercent = Math.round((nonstopCount / month.stops.length) * 100);
        month.hasNonstop = nonstopCount > 0;
      }
      delete month.prices; // Remove raw prices
      delete month.airlines; // Remove raw airlines
      delete month.stops; // Remove raw stops
    });

    // Sort all trips by price to find the cheapest specific dates
    const cheapestTrips = allTrips
      .sort((a, b) => a.price - b.price)
      .slice(0, 20); // Return top 20 cheapest trips

    console.log(`💰 Cheapest trip found: $${cheapestTrips[0]?.price || 'N/A'}`);

    const result = {
      origin,
      destination,
      tripDuration: duration,
      pricesByMonth: monthlyPrices,
      cheapestTrips: cheapestTrips,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      totalFlightsFound: totalFlights
    };

    // Cache the result
    cache.set(cacheKey, result);

    res.json(result);

  } catch (error) {
    console.error('❌ SerpApi Error:', error.message);
    
    if (error.response) {
      res.status(error.response.status || 500).json({
        error: 'Flight API Error',
        message: error.response.data?.error || error.message,
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
});

// Search specific flights for a date
app.get('/api/flights/search', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate } = req.query;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: origin, destination, and departureDate' 
      });
    }

    // Check cache
    const cacheKey = `search_${origin}_${destination}_${departureDate}_${returnDate || 'oneway'}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({ ...cachedData, cached: true });
    }

    console.log(`🔍 Searching flights: ${origin} → ${destination} on ${departureDate}`);

    if (!process.env.SERPAPI_KEY) {
      return res.status(500).json({
        error: 'API key not configured',
        message: 'Please add your SerpApi key to the .env file'
      });
    }

    // Default return date if not provided (7 days later)
    let returnDateStr = returnDate;
    if (!returnDateStr) {
      const returnDateObj = new Date(departureDate);
      returnDateObj.setDate(returnDateObj.getDate() + 7);
      returnDateStr = returnDateObj.toISOString().split('T')[0];
    }

    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_flights',
        departure_id: origin,
        arrival_id: destination,
        outbound_date: departureDate,
        return_date: returnDateStr,
        currency: 'USD',
        hl: 'en',
        api_key: process.env.SERPAPI_KEY
      }
    });

    const allFlights = [
      ...(response.data.best_flights || []),
      ...(response.data.other_flights || [])
    ];

    const result = {
      offers: allFlights.map(flight => ({
        price: flight.price,
        airline: flight.flights?.[0]?.airline,
        stops: flight.flights?.[0]?.travel_class === 'Nonstop' ? 0 : 1,
        duration: flight.total_duration,
        departure_time: flight.flights?.[0]?.departure_airport?.time,
        arrival_time: flight.flights?.[0]?.arrival_airport?.time,
        booking_link: flight.booking_token
      })),
      lastUpdated: new Date().toISOString()
    };

    // Cache for 1 hour
    cache.set(cacheKey, result, 3600);

    res.json(result);

  } catch (error) {
    console.error('❌ SerpApi Error:', error.message);
    
    if (error.response) {
      res.status(error.response.status || 500).json({
        error: 'Flight Search Error',
        message: error.response.data?.error || error.message
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  🚀 Budget Flight Finder API                  ║
║  📍 Running on port ${PORT}                     ║
║  ✈️  Using SerpApi (Google Flights)           ║
║  🎁 100 FREE searches/month                   ║
╚═══════════════════════════════════════════════╝

Health check: http://localhost:${PORT}/api/health
  `);
  
  if (!process.env.SERPAPI_KEY) {
    console.warn(`
⚠️  WARNING: SerpApi key not found!
   
   To get started:
   1. Go to https://serpapi.com/users/sign_up
   2. Sign up for FREE (no credit card needed)
   3. Copy your API key
   4. Add it to your .env file
   
   You get 100 FREE searches per month! 🎉
    `);
  } else {
    console.log('✅ SerpApi key configured');
    console.log('💡 Tip: Each search uses 1 API call. You have 100/month free!\n');
  }
});
