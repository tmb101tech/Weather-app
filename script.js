// Weather App JavaScript
class WeatherApp {
  constructor() {
    this.currentLocation = null;
    this.weatherData = null;
    this.units = {
      system: 'metric',
      temperature: 'celsius',
      windSpeed: 'kmh',
      precipitation: 'mm'
    };
    this.selectedDay = 0;
    this.searchTimeout = null;
    this.selectedSuggestionIndex = -1;
    
    this.initializeElements();
    this.bindEvents();
    this.loadDefaultLocation();
  }

  initializeElements() {
    // Search elements
    this.searchInput = document.getElementById('searchInput');
    this.searchButton = document.getElementById('searchButton');
    this.searchStatus = document.getElementById('searchStatus');
    this.searchSuggestions = document.getElementById('searchSuggestions');
    
    // Units elements
    this.unitsToggle = document.getElementById('unitsToggle');
    this.unitsMenu = document.getElementById('unitsMenu');
    this.unitsDropdown = document.querySelector('.units-dropdown');
    
    // Content elements
    this.weatherContent = document.getElementById('weatherContent');
    this.loadingState = document.getElementById('loadingState');
    this.errorState = document.getElementById('errorState');
    this.noResultsState = document.getElementById('noResultsState');
    this.retryButton = document.getElementById('retryButton');
    
    // Weather display elements
    this.currentWeatherIcon = document.getElementById('currentWeatherIcon');
    this.currentTemperature = document.getElementById('currentTemperature');
    this.currentLocation = document.getElementById('currentLocation');
    this.currentDateTime = document.getElementById('currentDateTime');
    this.feelsLike = document.getElementById('feelsLike');
    this.humidity = document.getElementById('humidity');
    this.windSpeed = document.getElementById('windSpeed');
    this.precipitation = document.getElementById('precipitation');
    this.dailyForecast = document.getElementById('dailyForecast');
    this.daySelector = document.getElementById('daySelector');
    this.hourlyChart = document.getElementById('hourlyChart');
  }

  bindEvents() {
    // Search events
    this.searchButton.addEventListener('click', () => this.handleSearch());
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (this.selectedSuggestionIndex >= 0) {
          this.selectSuggestion(this.selectedSuggestionIndex);
        } else {
          this.handleSearch();
        }
      }
    });
    
    // Search suggestions
    this.searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });
    
    this.searchInput.addEventListener('keydown', (e) => {
      this.handleSearchKeydown(e);
    });
    
    this.searchInput.addEventListener('blur', () => {
      // Delay hiding suggestions to allow for clicks
      setTimeout(() => this.hideSuggestions(), 150);
    });
    
    // Units dropdown events
    this.unitsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleUnitsDropdown();
    });
    
    document.addEventListener('click', (e) => {
      if (!this.unitsDropdown.contains(e.target)) {
        this.closeUnitsDropdown();
      }
    });
    
    // Units change events
    this.unitsMenu.addEventListener('change', (e) => {
      this.handleUnitsChange(e);
    });
    
    // Retry button
    this.retryButton.addEventListener('click', () => this.handleSearch());
    
    // Update date/time every minute
    setInterval(() => this.updateDateTime(), 60000);
  }

  async loadDefaultLocation() {
    // Try to get user's location, fallback to New York
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.searchByCoordinates(position.coords.latitude, position.coords.longitude);
          },
          () => {
            // Fallback to New York
            this.currentLocation = {
              name: 'New York, NY, United States',
              lat: 40.7128,
              lon: -74.0060
            };
            this.searchInput.value = 'New York, NY, United States';
            this.fetchWeatherData();
          }
        );
      } else {
        this.currentLocation = {
          name: 'New York, NY, United States',
          lat: 40.7128,
          lon: -74.0060
        };
        this.searchInput.value = 'New York, NY, United States';
        this.fetchWeatherData();
      }
    } catch (error) {
      this.currentLocation = {
        name: 'New York, NY, United States',
        lat: 40.7128,
        lon: -74.0060
      };
      this.searchInput.value = 'New York, NY, United States';
      this.fetchWeatherData();
    }
  }

  handleSearchInput(query) {
    clearTimeout(this.searchTimeout);
    
    if (query.length < 2) {
      this.hideSuggestions();
      return;
    }
    
    this.searchTimeout = setTimeout(() => {
      this.fetchSuggestions(query);
    }, 300);
  }

  async fetchSuggestions(query) {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding API request failed');
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        this.displaySuggestions(data.results);
      } else {
        this.hideSuggestions();
      }
    } catch (error) {
      console.error('Suggestions fetch error:', error);
      this.hideSuggestions();
    }
  }

  displaySuggestions(suggestions) {
    this.searchSuggestions.innerHTML = '';
    this.selectedSuggestionIndex = -1;
    
    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.dataset.index = index;
      
      const name = document.createElement('div');
      name.className = 'suggestion-name';
      name.textContent = suggestion.name;
      
      const details = document.createElement('div');
      details.className = 'suggestion-details';
      const locationParts = [];
      if (suggestion.admin1) locationParts.push(suggestion.admin1);
      if (suggestion.country) locationParts.push(suggestion.country);
      details.textContent = locationParts.join(', ');
      
      item.appendChild(name);
      item.appendChild(details);
      
      item.addEventListener('click', () => {
        this.selectSuggestion(index, suggestions);
      });
      
      this.searchSuggestions.appendChild(item);
    });
    
    this.searchSuggestions.classList.add('visible');
    this.searchSuggestions.suggestions = suggestions;
  }

  handleSearchKeydown(e) {
    const suggestions = this.searchSuggestions.querySelectorAll('.suggestion-item');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedSuggestionIndex = Math.min(this.selectedSuggestionIndex + 1, suggestions.length - 1);
      this.highlightSuggestion();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
      this.highlightSuggestion();
    } else if (e.key === 'Escape') {
      this.hideSuggestions();
      this.searchInput.blur();
    }
  }

  highlightSuggestion() {
    const suggestions = this.searchSuggestions.querySelectorAll('.suggestion-item');
    suggestions.forEach((item, index) => {
      item.classList.toggle('highlighted', index === this.selectedSuggestionIndex);
    });
  }

  selectSuggestion(index, suggestionsData = null) {
    const suggestions = suggestionsData || this.searchSuggestions.suggestions;
    if (!suggestions || !suggestions[index]) return;
    
    const suggestion = suggestions[index];
    const locationName = `${suggestion.name}${suggestion.admin1 ? ', ' + suggestion.admin1 : ''}${suggestion.country ? ', ' + suggestion.country : ''}`;
    
    this.searchInput.value = locationName;
    this.currentLocation = {
      name: locationName,
      lat: suggestion.latitude,
      lon: suggestion.longitude
    };
    
    this.hideSuggestions();
    this.showLoading();
    this.setSearchStatus('Loading weather data...', 'searching');
    this.fetchWeatherData().then(() => {
      this.setSearchStatus('');
    }).catch(() => {
      this.setSearchStatus('Failed to load weather data', 'error');
    });
  }

  hideSuggestions() {
    this.searchSuggestions.classList.remove('visible');
    this.selectedSuggestionIndex = -1;
  }

  async handleSearch() {
    const query = this.searchInput.value.trim();
    if (!query) return;
    
    this.hideSuggestions();
    this.showLoading();
    this.setSearchStatus('Searching...', 'searching');
    
    try {
      // First try to get suggestions and use the first result
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
      );
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        this.showNoResults();
        this.setSearchStatus('No results found', 'error');
        return;
      }
      
      const result = data.results[0];
      this.currentLocation = {
        name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`,
        lat: result.latitude,
        lon: result.longitude
      };
      
      await this.fetchWeatherData();
      this.setSearchStatus('');
    } catch (error) {
      console.error('Search error:', error);
      this.showError('Unable to fetch weather data. Please try again.');
      this.setSearchStatus('Search failed', 'error');
    }
  }

  async searchByCoordinates(lat, lon) {
    this.showLoading();
    this.setSearchStatus('Getting your location...', 'searching');
    
    try {
      // Reverse geocode to get location name
      const location = await this.reverseGeocode(lat, lon);
      this.currentLocation = location || { name: 'Current Location', lat, lon };
      this.searchInput.value = this.currentLocation.name;
      await this.fetchWeatherData();
      this.setSearchStatus('');
    } catch (error) {
      console.error('Location search error:', error);
      this.showError('Unable to fetch weather data for your location.');
      this.setSearchStatus('Location failed', 'error');
    }
  }

  async geocodeLocation(query) {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`,
          lat: result.latitude,
          lon: result.longitude
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  async reverseGeocode(lat, lon) {
    try {
      // Use a reverse geocoding service or fallback to coordinates
      return {
        name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
        lat: lat,
        lon: lon
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
        lat: lat,
        lon: lon
      };
    }
  }

  async fetchWeatherData() {
    if (!this.currentLocation) return;
    
    try {
      const { lat, lon } = this.currentLocation;
      const tempUnit = this.units.temperature === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      const windUnit = this.units.windSpeed === 'mph' ? 'mph' : 'kmh';
      const precipUnit = this.units.precipitation === 'in' ? 'inch' : 'mm';
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&precipitation_unit=${precipUnit}&timezone=auto&forecast_days=7`
      );
      
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }
      
      this.weatherData = await response.json();
      this.displayWeatherData();
      this.showWeatherContent();
    } catch (error) {
      console.error('Weather fetch error:', error);
      this.showError('Unable to fetch weather data. Please try again.');
    }
  }

  displayWeatherData() {
    if (!this.weatherData || !this.currentLocation) return;
    
    const { current, daily, hourly } = this.weatherData;
    
    // Update current weather
    document.getElementById('currentLocation').textContent = this.currentLocation.name;
    this.updateDateTime();
    
    const tempSymbol = this.units.temperature === 'fahrenheit' ? '°F' : '°C';
    const windUnit = this.units.windSpeed === 'mph' ? 'mph' : 'km/h';
    const precipUnit = this.units.precipitation === 'in' ? 'in' : 'mm';
    
    this.currentTemperature.textContent = `${Math.round(current.temperature_2m)}${tempSymbol}`;
    this.feelsLike.textContent = `${Math.round(current.apparent_temperature)}${tempSymbol}`;
    this.humidity.textContent = `${current.relative_humidity_2m}%`;
    this.windSpeed.textContent = `${Math.round(current.wind_speed_10m)} ${windUnit}`;
    this.precipitation.textContent = `${current.precipitation} ${precipUnit}`;
    
    // Update weather icon
    const weatherIcon = this.getWeatherIcon(current.weather_code);
    this.currentWeatherIcon.src = weatherIcon;
    this.currentWeatherIcon.alt = this.getWeatherDescription(current.weather_code);
    
    // Update daily forecast
    this.displayDailyForecast(daily, tempSymbol);
    
    // Update hourly forecast
    this.displayHourlyForecast(hourly, tempSymbol);
  }

  displayDailyForecast(daily, tempSymbol) {
    this.dailyForecast.innerHTML = '';
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(daily.time[i]);
      const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const forecastDay = document.createElement('div');
      forecastDay.className = `forecast-day ${i === 0 ? 'today' : ''}`;
      forecastDay.dataset.day = i;
      
      forecastDay.innerHTML = `
        <div class="forecast-date">${dayName}<br>${dayDate}</div>
        <img src="${this.getWeatherIcon(daily.weather_code[i])}" alt="${this.getWeatherDescription(daily.weather_code[i])}" class="forecast-icon">
        <div class="forecast-temps">
          <span class="forecast-high">${Math.round(daily.temperature_2m_max[i])}${tempSymbol}</span>
          <span class="forecast-low">${Math.round(daily.temperature_2m_min[i])}${tempSymbol}</span>
        </div>
      `;
      
      forecastDay.addEventListener('click', () => {
        this.selectedDay = i;
        this.updateDaySelector();
        this.displayHourlyForecast(this.weatherData.hourly, tempSymbol);
      });
      
      this.dailyForecast.appendChild(forecastDay);
    }
  }

  displayHourlyForecast(hourly, tempSymbol) {
    // Create day selector
    this.updateDaySelector();
    
    // Display hourly data for selected day
    const startHour = this.selectedDay * 24;
    const endHour = startHour + 24;
    
    const hourlyGrid = document.createElement('div');
    hourlyGrid.className = 'hourly-grid';
    
    for (let i = startHour; i < endHour && i < hourly.time.length; i++) {
      const time = new Date(hourly.time[i]);
      const hour = time.getHours();
      const hourString = hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`;
      
      const hourlyItem = document.createElement('div');
      hourlyItem.className = 'hourly-item';
      
      hourlyItem.innerHTML = `
        <div class="hourly-time">${hourString}</div>
        <img src="${this.getWeatherIcon(hourly.weather_code[i])}" alt="${this.getWeatherDescription(hourly.weather_code[i])}" class="hourly-icon">
        <div class="hourly-temp">${Math.round(hourly.temperature_2m[i])}${tempSymbol}</div>
      `;
      
      hourlyGrid.appendChild(hourlyItem);
    }
    
    this.hourlyChart.innerHTML = '';
    this.hourlyChart.appendChild(hourlyGrid);
  }

  updateDaySelector() {
    this.daySelector.innerHTML = '';
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.weatherData.daily.time[i]);
      const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const dayButton = document.createElement('button');
      dayButton.className = `day-button ${i === this.selectedDay ? 'active' : ''}`;
      dayButton.textContent = dayName;
      
      dayButton.addEventListener('click', () => {
        this.selectedDay = i;
        this.updateDaySelector();
        this.displayHourlyForecast(this.weatherData.hourly, this.units.temperature === 'fahrenheit' ? '°F' : '°C');
      });
      
      this.daySelector.appendChild(dayButton);
    }
  }

  updateDateTime() {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    this.currentDateTime.textContent = now.toLocaleDateString('en-US', options);
  }

  getWeatherIcon(weatherCode) {
    const iconMap = {
      0: './assets/images/icon-sunny.webp', // Clear sky
      1: './assets/images/icon-sunny.webp', // Mainly clear
      2: './assets/images/icon-partly-cloudy.webp', // Partly cloudy
      3: './assets/images/icon-overcast.webp', // Overcast
      45: './assets/images/icon-fog.webp', // Fog
      48: './assets/images/icon-fog.webp', // Depositing rime fog
      51: './assets/images/icon-drizzle.webp', // Light drizzle
      53: './assets/images/icon-drizzle.webp', // Moderate drizzle
      55: './assets/images/icon-drizzle.webp', // Dense drizzle
      56: './assets/images/icon-drizzle.webp', // Light freezing drizzle
      57: './assets/images/icon-drizzle.webp', // Dense freezing drizzle
      61: './assets/images/icon-rain.webp', // Slight rain
      63: './assets/images/icon-rain.webp', // Moderate rain
      65: './assets/images/icon-rain.webp', // Heavy rain
      66: './assets/images/icon-rain.webp', // Light freezing rain
      67: './assets/images/icon-rain.webp', // Heavy freezing rain
      71: './assets/images/icon-snow.webp', // Slight snow fall
      73: './assets/images/icon-snow.webp', // Moderate snow fall
      75: './assets/images/icon-snow.webp', // Heavy snow fall
      77: './assets/images/icon-snow.webp', // Snow grains
      80: './assets/images/icon-rain.webp', // Slight rain showers
      81: './assets/images/icon-rain.webp', // Moderate rain showers
      82: './assets/images/icon-rain.webp', // Violent rain showers
      85: './assets/images/icon-snow.webp', // Slight snow showers
      86: './assets/images/icon-snow.webp', // Heavy snow showers
      95: './assets/images/icon-storm.webp', // Thunderstorm
      96: './assets/images/icon-storm.webp', // Thunderstorm with slight hail
      99: './assets/images/icon-storm.webp' // Thunderstorm with heavy hail
    };
    
    return iconMap[weatherCode] || './assets/images/icon-partly-cloudy.webp';
  }

  getWeatherDescription(weatherCode) {
    const descriptions = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    
    return descriptions[weatherCode] || 'Unknown weather';
  }

  toggleUnitsDropdown() {
    this.unitsDropdown.classList.toggle('open');
  }

  closeUnitsDropdown() {
    this.unitsDropdown.classList.remove('open');
  }

  handleUnitsChange(event) {
    const { name, value } = event.target;
    
    if (this.units[name] !== value) {
      this.units[name] = value;
      
      // If system changed, update individual units
      if (name === 'system') {
        if (value === 'imperial') {
          this.units.temperature = 'fahrenheit';
          this.units.windSpeed = 'mph';
          this.units.precipitation = 'in';
        } else {
          this.units.temperature = 'celsius';
          this.units.windSpeed = 'kmh';
          this.units.precipitation = 'mm';
        }
        this.updateUnitRadios();
      }
      
      // Re-fetch weather data with new units
      if (this.currentLocation) {
        this.fetchWeatherData();
      }
    }
  }

  updateUnitRadios() {
    // Update radio buttons to match current units
    document.querySelector(`input[name="temperature"][value="${this.units.temperature}"]`).checked = true;
    document.querySelector(`input[name="windSpeed"][value="${this.units.windSpeed}"]`).checked = true;
    document.querySelector(`input[name="precipitation"][value="${this.units.precipitation}"]`).checked = true;
  }

  setSearchStatus(message, type = '') {
    this.searchStatus.textContent = message;
    this.searchStatus.className = `search-status ${type}`;
  }

  showLoading() {
    this.hideAllStates();
    this.loadingState.classList.add('visible');
  }

  showWeatherContent() {
    this.hideAllStates();
    this.weatherContent.classList.add('visible');
  }

  showError(message) {
    this.hideAllStates();
    this.errorState.classList.add('visible');
    document.getElementById('errorMessage').textContent = message;
  }

  showNoResults() {
    this.hideAllStates();
    this.noResultsState.classList.add('visible');
  }

  hideAllStates() {
    this.weatherContent.classList.remove('visible');
    this.loadingState.classList.remove('visible');
    this.errorState.classList.remove('visible');
    this.noResultsState.classList.remove('visible');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WeatherApp();
});