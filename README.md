# 🌍 BMKG Earthquake Monitor

<div align="center">
  <img src="assets/img/bmkg.png" alt="BMKG Logo" width="150">
  <br>
  <h3>Real-time Seismic Activity Tracking in Indonesia</h3>
  <p>Stay informed about seismic events across the Indonesian archipelago</p>

  <div>
    <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" alt="Status">
    <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge" alt="Version">
    <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
    <img src="https://img.shields.io/badge/Updated-Daily-green?style=for-the-badge" alt="Updates">
  </div>

  <br>
  <p align="center">
    <a href="#-key-features">Features</a> •
    <a href="#-installation">Installation</a> •
    <a href="#-technical-implementation">Tech Stack</a> •
    <a href="#-contributing">Contributing</a> •
    <a href="#-contact">Contact</a>
  </p>
</div>

<hr>

## 🌟 Highlights

-  🚀 **Real-time Monitoring**: Live earthquake data updates every 5 minutes
-  🎯 **High Accuracy**: Direct feed from BMKG's official data sources
-  💡 **Smart Features**: Intelligent data processing and visualization
-  🔒 **Reliable**: Built with robust error handling and failsafes

## ✨ Key Features

-  🔄 **Real-time Updates**: Automatic data refresh every 5 minutes
-  📊 **Comprehensive Dashboard**:
   -  Total events counter
   -  Significant events tracker
   -  Felt reports summary
   -  Last update timestamp
-  🗺️ **Interactive Map**: Dynamic visualization with color-coded markers
-  📈 **Timeline Chart**: Historical earthquake frequency analysis
-  📱 **Modern UI**: Responsive design with glass-morphism effects
-  ⚡ **Performance**: Optimized loading with caching system

<hr>

## 🛠️ Technical Implementation

### Tech Stack

<div align="center">
  <table>
    <tr>
      <td align="center"><img src="https://raw.githubusercontent.com/tailwindlabs/tailwindcss/master/.github/logo-dark.svg" width="40"><br><sub><b>Tailwind CSS</b></sub></td>
      <td align="center"><img src="https://www.chartjs.org/img/chartjs-logo.svg" width="40"><br><sub><b>Chart.js</b></sub></td>
      <td align="center"><img src="https://leafletjs.com/docs/images/logo.png" width="40"><br><sub><b>Leaflet.js</b></sub></td>
      <td align="center"><img src="https://moment.github.io/luxon/docs/_media/Luxon_icon_64x64.png" width="40"><br><sub><b>Luxon</b></sub></td>
    </tr>
  </table>
</div>

### Frontend Technologies

-  **CSS Framework**: Tailwind CSS with custom configurations
-  **JavaScript Libraries**:
   -  Chart.js for data visualization
   -  Leaflet.js for interactive maps
   -  Luxon for datetime handling
   -  FancyBox for image galleries
   -  Lodash for utility functions

### Data Integration

-  Real-time data from BMKG XML feeds:
   -  Latest earthquakes
   -  Felt earthquakes
   -  Significant events (M 5.0+)

### Performance Features

-  Data caching system (5-minute cache duration)
-  Throttled updates to prevent API overload
-  Optimized asset loading
-  Responsive image handling

<hr>

## 💫 UI Components

### Dashboard Cards

-  Latest Earthquake Information
   -  Magnitude and depth display
   -  Location details
   -  Shakemap viewer (when available)
   -  Felt reports integration

### Interactive Tables

-  Felt Earthquakes Table
   -  Time and location
   -  Magnitude classification
   -  Impact reports
-  Major Earthquakes Table
   -  Chronological listing
   -  Potential hazard information

### Data Visualization

-  Timeline Chart
   -  Magnitude trends
   -  Interactive tooltips
   -  Dynamic date scaling
-  Interactive Map
   -  Color-coded markers
   -  Popup information
   -  Responsive sizing

<hr>

## 🚀 Quick Start

### Prerequisites

-  Modern web browser (Chrome, Firefox, Safari, Edge)
-  Internet connection for real-time updates

### Installation Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/RehanDias/gempa.git
   ```

   or visit the live site:

   ```
   https://rehandias.github.io/gempa
   ```

2. Navigate to the project directory:
   ```bash
   cd gempa
   ```
3. Open `index.html` in your browser or use a local server for full functionality.

<hr>

## 📊 Features Overview

<table>
  <tr>
    <td align="center">
      <img src="https://img.icons8.com/fluency/48/000000/dashboard.png"/><br>
      <b>Dynamic Dashboard</b><br>
      Real-time statistics
    </td>
    <td align="center">
      <img src="https://img.icons8.com/fluency/48/000000/map-marker.png"/><br>
      <b>Interactive Map</b><br>
      Visual tracking
    </td>
    <td align="center">
      <img src="https://img.icons8.com/fluency/48/000000/line-chart.png"/><br>
      <b>Time Analysis</b><br>
      Trend visualization
    </td>
  </tr>
</table>

## 🌐 Live Demo

Try the live version: [BMKG Earthquake Monitor](https://rehandias.github.io/gempa)

## 📱 Mobile View

The dashboard is fully responsive and works seamlessly on mobile devices.

## 🤝 Contributing

We welcome contributions! Here's how you can help:

-  🐛 Report bugs
-  💡 Suggest features
-  🔧 Submit pull requests

<hr>

## 📜 Acknowledgements

-  Data provided by [BMKG Indonesia](https://www.bmkg.go.id/)
-  Icons by [Icons8](https://icons8.com/)
-  Special thanks to all contributors

<hr>

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<hr>

## 📞 Contact

For questions or feedback about this project, please contact:

-  📧 Email: [rehanpratama282@gmail.com](mailto:rehanpratama282@gmail.com)
-  📸 Instagram: [@rehandiazz](https://www.instagram.com/rehandiazz)

For official BMKG information:

-  🌐 BMKG Website: [https://www.bmkg.go.id/](https://www.bmkg.go.id/)

<hr>

<div align="center">
  <br>
  <p>
    <sub>If you found this project helpful, consider giving it a ⭐</sub>
  </p>
  <sub>Built with ❤️ by rehan dias in 🇮🇩</sub>
</div>
