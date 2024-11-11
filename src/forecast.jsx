import React, { useState, useEffect , useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faSun,
  faCloud,
  faCloudSun,
  faCloudShowersHeavy,
  faCloudRain,
  faSnowflake,
  faBolt,
  faSmog,
  faQuestion,
  faTimes,
  faWalking
} from "@fortawesome/free-solid-svg-icons";
import { GoogleGenerativeAI } from "@google/generative-ai";

const WeatherNow = () => {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [historicalWeather, setHistoricalWeather] = useState([]);
  const [forecastWeather, setForecastWeather] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bgClass, setBgClass] = useState(
    "bg-gradient-to-br from-blue-400 to-blue-600"
  );
  const [displayMode, setDisplayMode] = useState("current");
  const [selectedDay, setSelectedDay] = useState(null);
  const [showQuery, setShowQuery] = useState(false);
  const [query, setQuery] = useState("");
  const [activities, setActivities] = useState([]);
  const weatherCardRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState("auto");

  const GEMINI_API_KEY ="";

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  useEffect(() => {
    if (weatherCardRef.current) {
      const updateHeight = () => {
        const weatherCardHeight = weatherCardRef.current.offsetHeight;
        setMaxHeight(`${weatherCardHeight}px`);
      };

      updateHeight();
      window.addEventListener('resize', updateHeight);

      return () => window.removeEventListener('resize', updateHeight);
    }
  }, [weather, displayMode]); // Update when weather or display mode changes

  const handleQuerySubmit = () => {
    // Handle the query submission here
    console.log("Query submitted:", query);
    setQuery("");
    setShowQuery(false);
  };

  const getWeatherIcon = (skyCondition) => {
    switch (skyCondition) {
      case "Clear Sky":
        return faSun;
      case "Partly Cloudy":
        return faCloudSun;
      case "Foggy":
        return faSmog;
      case "Drizzle":
      case "Rainy":
        return faCloudRain;
      case "Rain Showers":
        return faCloudShowersHeavy;
      case "Snowy":
      case "Snow Showers":
        return faSnowflake;
      case "Thunderstorm":
        return faBolt;
      default:
        return faCloud;
    }
  };

  const formatDate = (dateString) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  const formatFullDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSkyCondition = (code) => {
    if (code === 0) return "Clear Sky";
    if (code === 1 || code === 2 || code === 3) return "Partly Cloudy";
    if (code >= 45 && code <= 48) return "Foggy";
    if (code >= 51 && code <= 57) return "Drizzle";
    if (code >= 61 && code <= 67) return "Rainy";
    if (code >= 71 && code <= 77) return "Snowy";
    if (code >= 80 && code <= 82) return "Rain Showers";
    if (code >= 85 && code <= 86) return "Snow Showers";
    if (code >= 95 && code <= 99) return "Thunderstorm";
    return "Overcast";
  };

  const fetchWeather = async () => {
    setLoading(true);
    setError("");
    setWeather(null);
    setActivities([]);
  
    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      const geoData = await geoResponse.json();
  
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("City not found");
      }
  
      const { latitude, longitude } = geoData.results[0];
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,windspeed_10m`
      );
      const weatherData = await weatherResponse.json();
  
      const weathercode = weatherData.current_weather.weathercode;
      const skyCondition = getSkyCondition(weathercode);
  
      setWeather({
        temperature: weatherData.current_weather.temperature,
        windspeed: weatherData.current_weather.windspeed,
        humidity: weatherData.hourly.relativehumidity_2m[0],
        precipitation: weatherData.hourly.precipitation_probability[0],
        weathercode,
        skyCondition,
      });
  
      // Generate prompt for activity suggestions
      const prompt = `Suggest activities to do in ${city} when the weather is ${skyCondition} and the temperature is ${weatherData.current_weather.temperature}°C. List only concise activity suggestions, without explanations.`;
  
      try {
        const result = await model.generateContent(prompt); // Get activity suggestions from Gemini model
        const activitySuggestions = result.response.text(); // Get suggestions from the response
  
        if (activitySuggestions) {
          const activityList = activitySuggestions
            .split("\n")
            .map((activity) => activity.trim())
            .filter(
              (activity) =>
                activity.length > 0 &&
                !activity.includes("Remember") &&
                !activity.includes("suggestions")
            );
  
          setActivities(activityList);
        } else {
          throw new Error("No activity suggestions found.");
        }
      } catch (err) {
        console.error("Error fetching activity suggestions:", err);
        setError("Failed to fetch activity suggestions");
      }
    } catch (err) {
      console.error("Error fetching weather data:", err);
      setError(err.message || "Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };
  

  const fetchHistoricalWeather = async () => {
    setLoading(true);
    setError("");
    setHistoricalWeather([]);

    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=1&language=en&format=json`
      );
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("City not found");
      }

      const { latitude, longitude } = geoData.results[0];
      const historicalResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&past_days=0&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max`
      );
      const historicalData = await historicalResponse.json();

      setHistoricalWeather(
        historicalData.daily.temperature_2m_max.map((temp, index) => ({
          date: historicalData.daily.time[index],
          maxTemp: temp,
          minTemp: historicalData.daily.temperature_2m_min[index],
          windspeed: historicalData.daily.windspeed_10m_max[index],
          precipitation: historicalData.daily.precipitation_sum[index],
        }))
      );
    } catch (err) {
      setError(err.message || "Failed to fetch historical weather data");
    } finally {
      setLoading(false);
    }
  };

  const fetchForecastWeather = async () => {
    setLoading(true);
    setError("");
    setForecastWeather([]);

    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=1&language=en&format=json`
      );
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("City not found");
      }

      const { latitude, longitude } = geoData.results[0];
      const forecastResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto`
      );
      const forecastData = await forecastResponse.json();

      setForecastWeather(
        forecastData.daily.temperature_2m_max.map((temp, index) => ({
          date: forecastData.daily.time[index],
          maxTemp: temp,
          minTemp: forecastData.daily.temperature_2m_min[index],
          windspeed: forecastData.daily.windspeed_10m_max[index],
          precipitation: forecastData.daily.precipitation_sum[index],
        }))
      );
    } catch (err) {
      setError(err.message || "Failed to fetch forecast weather data");
    } finally {
      setLoading(false);
    }
  };

  const handleHistoricalClick = async () => {
    await fetchHistoricalWeather();
    setDisplayMode("historical");
    setWeather(null); // Clear current weather
    setForecastWeather([]); // Clear forecast data
  };

  const handleForecastClick = async () => {
    await fetchForecastWeather();
    setDisplayMode("forecast");
    setWeather(null); // Clear current weather
    setHistoricalWeather([]); // Clear historical data
  };

  const handleCurrentClick = async () => {
    await fetchWeather();
    setDisplayMode("current");
    setHistoricalWeather([]); // Clear historical data
    setForecastWeather([]); // Clear forecast data
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
  };

  const handleBackToOverview = () => {
    setSelectedDay(null);
  };

  const renderDetailedView = (day) => {
    return (
      <div className="weather-info animate__animated animate__fadeIn">
        <button
          onClick={handleBackToOverview}
          className="mb-4 text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md"
        >
          ← Back to Overview
        </button>
        <h2 className="text-2xl font-bold mb-2">{city}</h2>
        <h3 className="text-xl mb-4">{formatFullDate(day.date)}</h3>
        <div className="temperature flex items-center justify-center text-6xl font-bold mb-6">
          <FontAwesomeIcon
            icon={getWeatherIcon("Partly Cloudy")}
            className="text-yellow-400 mr-4"
          />
          {Math.round(day.maxTemp)}°C
        </div>
        <div className="sky-condition text-xl font-semibold mb-4 py-4 bg-white/20 rounded-md">
          Temperature Range: {Math.round(day.minTemp)}°C - {Math.round(day.maxTemp)}°C
        </div>
        <div className="details bg-white/20 rounded-md p-4 shadow-md">
          <p>Precipitation: {day.precipitation} mm</p>
          <p>Wind Speed: {day.windspeed} km/h</p>
        </div>
      </div>
    );
  };

  const renderWeatherGrid = (data, mode) => {
    if (!data.length) return null;
    
    return (
      <div className="weather-grid">
        {/* <h2 className="text-2xl font-bold mb-2">{city}</h2> */}
        <div className="grid grid-cols-7 gap-4 bg-gray-900 rounded-lg p-4">
  {data.map((day) => (
    <div
      key={day.date}
      className="flex flex-col items-center justify-center text-center text-white cursor-pointer hover:bg-gray-800 rounded-lg p-2 transition-colors duration-300"
      onClick={() => handleDayClick(day)}
    >
      <div className="font-medium mb-2">{formatDate(day.date)}</div>
      <div className="mb-2">
        <FontAwesomeIcon
          icon={getWeatherIcon("Partly Cloudy")}
          className="text-yellow-400 text-2xl"
        />
      </div>
      <div className="flex justify-center items-center gap-2">
        <span className="font-bold">{Math.round(day.maxTemp)}°</span>
        <span className="text-gray-400">{Math.round(day.minTemp)}°</span>
      </div>
    </div>
  ))}
</div>

      </div>
    );
  };

  return (
    <div className="w-full bg-gradient-to-br from-blue-400 to-blue-600 transition-all duration-1000 relative min-h-screen flex items-center justify-center p-8">
      <div className="flex gap-8 items-start justify-center">
        {/* Weather Card */}
        <div 
          ref={weatherCardRef}
          className="weather-card animate__animated animate__fadeIn max-w-2xl w-full"
        >
          <h1 className="title text-4xl font-bold mb-4 text-center">Weather Now</h1>
          <div className="input-container flex items-center mb-6">
            <input
              type="text"
              placeholder="Enter city name"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="search-input bg-white rounded-l-md py-2 px-4 flex-1 focus:outline-none"
            />
            <button
              onClick={handleCurrentClick}
              disabled={loading}
              className="search-button bg-blue-500 hover:bg-blue-600 text-white rounded-r-md py-2 px-4 transition-colors duration-300"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
  
          <div className="flex justify-between gap-4 mb-6">
            <button
              onClick={handleHistoricalClick}
              className={`w-full py-2 px-4 rounded-md transition-colors duration-300 ${
                displayMode === 'historical' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
            >
              Historical Data
            </button>
            <button
              onClick={handleForecastClick}
              className={`w-full py-2 px-4 rounded-md transition-colors duration-300 ${
                displayMode === 'forecast' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              Forecast Data
            </button>
          </div>
  
          {error && (
            <div className="error-message bg-red-500 text-white px-4 py-2 rounded-md mb-4">
              <p>{error}</p>
            </div>
          )}
  
          {displayMode === 'current' && weather && (
            <div className="weather-info animate__animated animate__fadeIn text-center">
              <h2 className="text-2xl font-bold mb-2">{city}</h2>
              <div className="temperature flex items-center justify-center text-6xl font-bold mb-6">
                <FontAwesomeIcon
                  icon={getWeatherIcon(weather.skyCondition)}
                  className="text-yellow-400 mr-4"
                />
                {weather.temperature}°C
              </div>
              <div className="sky-condition text-xl font-semibold mb-4 py-4 bg-white/20 rounded-md">
                {weather.skyCondition}
              </div>
              <div className="details bg-white/20 rounded-md p-4 shadow-md">
                <p>Humidity: {weather.humidity}%</p>
                <p>Precipitation: {weather.precipitation}%</p>
                <p>Wind Speed: {weather.windspeed} km/h</p>
              </div>
            </div>
          )}
  
          {(displayMode === 'historical' || displayMode === 'forecast') && city && (
            <div className="text-center mb-6 animate__animated animate__fadeIn">
              <h2 className="text-3xl font-bold mb-2">{city}</h2>
              <p className="text-xl text-black/90">
                {displayMode === 'historical' ? 'Historical Weather Data' : 'Weather Forecast'}
              </p>
            </div>
          )}
  
          <div className="mt-6">
            {displayMode === 'historical' && (
              selectedDay ? renderDetailedView(selectedDay) : renderWeatherGrid(historicalWeather, 'historical')
            )}
  
            {displayMode === 'forecast' && (
              selectedDay ? renderDetailedView(selectedDay) : renderWeatherGrid(forecastWeather, 'forecast')
            )}
          </div>
        </div>
  
        {/* Activities Panel */}
        {displayMode === 'current' && weather && activities.length > 0 && (
          <div 
            className="activities-panel animate__animated animate__fadeIn w-80"
            style={{ height: maxHeight }}
          >
            <div className="bg-white/20 backdrop-blur-sm rounded-md p-6 sticky top-8 h-full">
              <div className="flex flex-col h-full">
                <h3 className="text-xl font-bold mb-4 flex items-center text-white">
                  <FontAwesomeIcon icon={faWalking} className="mr-2" />
                  Things to Do in {city}
                </h3>
                <div className="overflow-y-auto flex-1 pr-2 activities-scroll">
                  <ul className="space-y-3">
                    {activities.map((activity, index) => (
                      <li 
                        key={index}
                        className="bg-white/30 rounded-md p-3 transition-all hover:bg-white/40 text-white"
                      >
                        {activity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  
      {/* Floating Query Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {showQuery ? (
          <div className="bg-white rounded-lg shadow-lg p-4 animate__animated animate__fadeIn flex items-center gap-2">
            <input
              type="text"
              placeholder="How may I help you?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleQuerySubmit}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-md py-2 px-4 transition-colors duration-300"
            >
              Search
            </button>
            <button
              onClick={() => setShowQuery(false)}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowQuery(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-colors duration-300"
          >
            <FontAwesomeIcon icon={faQuestion} className="text-xl" />
          </button>
        )}
      </div>
    </div>
  );
  
};

export default WeatherNow;