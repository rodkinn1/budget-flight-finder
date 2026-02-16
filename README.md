# Budget Flight Finder - Google Flights Edition

Get REAL Google Flights data in your app! 🎉

## 🌟 Why SerpApi is PERFECT for You

✅ **Real Google Flights Data** - Same prices you see on Google  
✅ **100 FREE Searches/Month** - Perfect for MVP testing  
✅ **5-Minute Setup** - Easiest API ever  
✅ **No Credit Card** - Completely free to start  
✅ **Works for Individuals** - No business verification needed  

## 🚀 Super Quick Setup

### Step 1: Get Your FREE API Key (2 minutes)

1. Go to: **https://serpapi.com/users/sign_up**
2. Sign up with your email
3. Verify your email
4. Go to: **https://serpapi.com/manage-api-key**
5. Copy your API key

**That's it!** No forms, no waiting, instant access! 🎉

### Step 2: Setup Project (3 minutes)

Put all the downloaded files in one folder, then:

```bash
# Open Terminal and go to your folder
cd ~/Desktop/flight-app-serpapi

# Install (one time only)
npm install

# Create .env file
cp .env.example .env

# Open .env and paste your API key
nano .env
# (or just open .env in any text editor)
```

Your `.env` file should look like:
```
SERPAPI_KEY=your_actual_key_here
PORT=3001
```

### Step 3: Run It! (30 seconds)

```bash
npm start
```

You'll see:
```
╔═══════════════════════════════════════════════╗
║  🚀 Budget Flight Finder API                  ║
║  📍 Running on port 3001                      ║
║  ✈️  Using SerpApi (Google Flights)           ║
║  🎁 100 FREE searches/month                   ║
╚═══════════════════════════════════════════════╝

✅ SerpApi key configured
```

### Step 4: Open Your App

Double-click `index.html` or open it in your browser!

## 🎮 Try It Out

**Popular routes to test:**
- **LAX** → **JFK** (Los Angeles to New York)
- **DTW** → **MCO** (Detroit to Orlando)
- **ORD** → **LAX** (Chicago to LA)
- **ATL** → **MIA** (Atlanta to Miami)

**Budget**: Try $300-$500

Click "Find Cheapest Flights" and wait 30-60 seconds (it's searching 12 months of flights!)

## 💡 How It Works

The app searches **48 different dates** across the next 12 months to give you accurate price trends:
- 4 dates per month (1st, 8th, 15th, 22nd)
- Gets real prices from Google Flights
- Caches results for 6 hours (saves your API calls)

## 📊 API Usage

**Free Tier:**
- 100 searches per month
- Each route search uses ~48 API calls (to get all the months)
- So you can search **2-3 routes per month** for free
- Perfect for MVP testing!

**Paid Plans** (if you need more):
- $50/month = 5,000 searches
- $150/month = 20,000 searches

## 🎯 Tips for MVP

1. **Test with Popular Routes** - They have more flight data
2. **Cache is Your Friend** - Same search within 6 hours = no API call
3. **Start Small** - 2-3 test routes is plenty for validation
4. **Show to Users** - Get feedback before paying for more

## ❓ Troubleshooting

### "API key not configured"
- Make sure `.env` file exists
- Check the API key is correct (no spaces)
- Restart the server after adding the key

### "Backend API is not running"
- Open Terminal
- Run `npm start` in the project folder
- Make sure you see the success message

### Port already in use
- Change `PORT=3001` to `PORT=3002` in `.env`
- Restart the server

### No results for a route
- Try a more popular route (LAX-JFK, DTW-MCO)
- Some smaller airports might not have data
- Wait and try again (sometimes API is busy)

### Searches taking forever
- First search takes 30-60 seconds (checking 12 months)
- Cached searches are instant
- This is normal!

## 🚀 What's Next?

Once your MVP is validated:

1. **Add User Accounts** - Save favorite routes
2. **Email Alerts** - Notify when prices drop
3. **More Features**:
   - Flexible dates (±3 days)
   - Multiple airports
   - Price history charts
   - Direct booking links

4. **Consider Upgrading** if you get lots of users

## 💰 Cost Planning

**MVP Phase** (Free):
- 100 searches/month = ~3 routes
- Perfect for testing

**Launch Phase** ($50/month):
- 5,000 searches = ~100 routes
- Good for initial users

**Growth Phase** ($150+/month):
- Scale as needed
- Consider caching strategies

## 🎉 You Did It!

You now have a working MVP with REAL Google Flights data!

Test it, show it to friends, get feedback, and iterate. You're on your way! 🚀

---

**Need help?** Check the error messages - they're designed to be helpful!
