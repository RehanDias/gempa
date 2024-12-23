const DateTime = luxon.DateTime;

let map;
let markers = [];
let timelineChart;

// Add utility functions
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function showLoading() {
   document.getElementById("loading-state").classList.remove("hidden");
}

function hideLoading() {
   document.getElementById("loading-state").classList.add("hidden");
}

function showError(message) {
   document.getElementById("error-message").textContent = message;
   document.getElementById("error-state").classList.remove("hidden");
}

function hideError() {
   document.getElementById("error-state").classList.add("hidden");
}

async function fetchWithTimeout(url, timeout = 5000) {
   const controller = new AbortController();
   const id = setTimeout(() => controller.abort(), timeout);
   try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return response;
   } catch (error) {
      clearTimeout(id);
      throw error;
   }
}

async function fetchWithRetry(url, retries = 3) {
   for (let i = 0; i < retries; i++) {
      try {
         return await fetchWithTimeout(url);
      } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, i))
         );
      }
   }
}

// Map functions
function initMap() {
   map = L.map("map").setView([-2.5, 118], 5);
   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
   }).addTo(map);
}

function addEarthquakeMarkers(earthquakes) {
   markers.forEach((marker) => map.removeLayer(marker));
   markers = [];

   earthquakes.forEach((eq) => {
      let lat = parseFloat(eq.Lintang.replace("°", "").replace(",", "."));
      lat = eq.Lintang.includes("LU") ? lat : -lat;
      let lon = parseFloat(
         eq.Bujur.replace("°", "").replace("BT", "").replace(",", ".")
      );
      const magnitude = parseFloat(eq.Magnitude);
      const markerSize = Math.max(3, magnitude * 1.5);
      const markerColor = getMarkerColor(magnitude);

      const marker = L.circleMarker([lat, lon], {
         radius: markerSize,
         fillColor: markerColor,
         color: "#000",
         weight: 1,
         opacity: 1,
         fillOpacity: 0.8,
      }).addTo(map);

      const popupContent = `
            <strong>Magnitude:</strong> ${magnitude}<br>
            <strong>Location:</strong> ${eq.Wilayah}<br>
            <strong>Date:</strong> ${eq.Tanggal} ${eq.Jam}<br>
            <strong>Depth:</strong> ${eq.Kedalaman}
            ${eq.Dirasakan ? `<br><strong>Felt:</strong> ${eq.Dirasakan}` : ""}
        `;

      marker.bindPopup(popupContent);
      markers.push(marker);
   });

   if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
   }
}

function getMarkerColor(magnitude) {
   if (magnitude >= 7) return "#FF0000";
   if (magnitude >= 6) return "#FF4500";
   if (magnitude >= 5) return "#FFA500";
   if (magnitude >= 4) return "#FFD700";
   if (magnitude >= 3) return "#ADFF2F";
   return "#00FF00";
}
function parseDateTime(tanggal, jam, dateTimeISO) {
   // Coba parse dari DateTime ISO jika tersedia
   if (dateTimeISO) {
      const dateTime = DateTime.fromISO(dateTimeISO, { zone: "UTC" });
      if (dateTime.isValid) {
         return dateTime.setZone("Asia/Jakarta");
      }
   }

   // Jika DateTime ISO tidak valid atau tidak tersedia, gunakan Tanggal dan Jam
   const timeWithoutWIB = jam.replace(" WIB", "");

   // Pemetaan bulan dalam bahasa Indonesia dan Inggris
   const monthMap = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      Mei: "05",
      May: "05",
      Jun: "06",
      Jul: "07",
      Agu: "08",
      Aug: "08",
      Sep: "09",
      Okt: "10",
      Oct: "10",
      Nov: "11",
      Des: "12",
      Dec: "12",
   };

   const [day, monthStr, year] = tanggal.split(" ");

   const month = monthMap[monthStr] || monthStr;

   const formattedDateTimeString = `${year}-${month.padStart(
      2,
      "0"
   )}-${day.padStart(2, "0")}T${timeWithoutWIB}`;

   let dateTime = DateTime.fromISO(formattedDateTimeString, {
      zone: "Asia/Jakarta",
   });

   // Jika masih tidak valid, coba format lain
   if (!dateTime.isValid) {
      dateTime = DateTime.fromFormat(
         formattedDateTimeString,
         "yyyy-MM-dd'T'HH:mm:ss",
         { zone: "Asia/Jakarta" }
      );
   }

   return dateTime;
}
// Data fetching and processing
async function fetchGempaData(url) {
   const cached = cache.get(url);
   if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
   }

   try {
      showLoading();
      const response = await fetchWithRetry(url);
      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const result = Array.from(xmlDoc.querySelectorAll("gempa")).map(
         (item) => ({
            Tanggal: item.querySelector("Tanggal")?.textContent || "",
            Jam: item.querySelector("Jam")?.textContent || "",
            DateTime: item.querySelector("DateTime")?.textContent || "",
            Coordinates:
               item.querySelector("point coordinates")?.textContent || "",
            Lintang: item.querySelector("Lintang")?.textContent || "",
            Bujur: item.querySelector("Bujur")?.textContent || "",
            Magnitude: item.querySelector("Magnitude")?.textContent || "",
            Kedalaman: item.querySelector("Kedalaman")?.textContent || "",
            Wilayah: item.querySelector("Wilayah")?.textContent || "",
            Potensi: item.querySelector("Potensi")?.textContent || "",
            Dirasakan: item.querySelector("Dirasakan")?.textContent || "",
            Shakemap: item.querySelector("Shakemap")?.textContent || "",
         })
      );

      cache.set(url, {
         data: result,
         timestamp: Date.now(),
      });

      return result;
   } catch (error) {
      console.error("Error fetching earthquake data:", error);
      showError("Failed to load earthquake data. Please try again later.");
      throw error;
   } finally {
      hideLoading();
   }
}

// Add new function to update dashboard stats
function updateDashboardStats(feltEarthquakes, recentEarthquakes) {
   const allEvents = [...feltEarthquakes, ...recentEarthquakes];
   const totalEvents = allEvents.length;
   const significantEvents = allEvents.filter(
      (eq) => parseFloat(eq.Magnitude) >= 5.0
   ).length;
   const feltReports = feltEarthquakes.length;

   document.getElementById("total-events").textContent = totalEvents;
   document.getElementById("significant-events").textContent =
      significantEvents;
   document.getElementById("felt-reports").textContent = feltReports;
   document.getElementById("last-update").textContent = DateTime.now()
      .setZone("Asia/Jakarta")
      .toFormat("HH:mm 'WIB'");
}

// Update the existing updateAllEarthquakeData function
async function updateAllEarthquakeData() {
   try {
      const feltEarthquakes = await fetchGempaData(
         "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.xml"
      );
      const recentLargeEarthquakes = await fetchGempaData(
         "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.xml"
      );

      updateDashboardStats(feltEarthquakes, recentLargeEarthquakes);
      createFeltEarthquakesTable(feltEarthquakes);
      createTable(recentLargeEarthquakes, "recent"); // Specify table type
      createTimelineChart([...feltEarthquakes, ...recentLargeEarthquakes]);
      addEarthquakeMarkers([...feltEarthquakes, ...recentLargeEarthquakes]);
   } catch (error) {
      console.error("Error updating earthquake data:", error);
      showErrorMessage(
         "Failed to update earthquake data. Please try again later."
      );
   }
}

async function updateGempaData(url, isLatest) {
   try {
      const gempaData = await fetchGempaData(url);
      if (gempaData.length > 0) {
         if (isLatest) {
            createLatestGempaInfo(gempaData[0]);
         } else {
            createTable(gempaData);
            createTimelineChart(gempaData);
            addEarthquakeMarkers(gempaData);
         }
      }
   } catch (error) {
      console.error("Error updating earthquake data:", error);
      showErrorMessage(
         "Failed to update earthquake data. Please try again later."
      );
   }
}

// Add retry mechanism
function retryDataLoad() {
   hideError();
   updateAllEarthquakeData();
}

// Improve update function with throttling
const throttledUpdate = _.throttle(updateAllEarthquakeData, 10000);

// UI update functions
function createLatestGempaInfo(gempaData) {
   const latestGempaInfo = document.getElementById("latest-gempa-info");
   const dateTime = parseDateTime(gempaData.Tanggal, gempaData.Jam);
   const formattedDateTime = dateTime.isValid
      ? dateTime.toFormat("dd MMM yyyy HH:mm 'WIB'")
      : "Invalid Date";

   const shakemapUrl = gempaData.Shakemap
      ? `https://data.bmkg.go.id/DataMKG/TEWS/${gempaData.Shakemap}`
      : null;

   const magnitude = parseFloat(gempaData.Magnitude);
   const magnitudeColor =
      magnitude >= 6
         ? "text-red-600"
         : magnitude >= 5
         ? "text-orange-500"
         : "text-blue-600";

   latestGempaInfo.innerHTML = `
        <div class="space-y-3 sm:space-y-4 animate-fade-in">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div class="space-y-3 sm:space-y-4">
                    <!-- Magnitude and Depth Card -->
                    <div class="bg-white/70 backdrop-blur-sm rounded-lg p-4 sm:p-5">
                        <div class="flex items-center justify-between mb-2 sm:mb-3">
                            <div>
                                <h3 class="text-2xl sm:text-3xl font-bold ${magnitudeColor}">${
      gempaData.Magnitude
   }</h3>
                                <p class="text-xs sm:text-sm text-gray-500">Magnitude (SR)</p>
                            </div>
                            <div class="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center ${
                               magnitude >= 5 ? "bg-red-50" : "bg-blue-50"
                            }">
                                <i class="fas fa-wave-square text-lg sm:text-xl ${magnitudeColor}"></i>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="text-lg font-medium text-gray-800">${
                                   gempaData.Kedalaman
                                }</h4>
                                <p class="text-sm text-gray-500">Depth</p>
                            </div>
                        </div>
                    </div>

                    <!-- Location Card -->
                    <div class="bg-white/70 backdrop-blur-sm rounded-lg p-5">
                        <div class="flex items-start space-x-3">
                            <div class="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-map-pin text-blue-600"></i>
                            </div>
                            <div class="flex-1">
                                <p class="text-gray-800 font-medium leading-relaxed">${
                                   gempaData.Wilayah
                                }</p>
                                <div class="inline-flex items-center px-2.5 py-0.5 mt-2 rounded-md bg-blue-50 text-sm text-blue-700">
                                    ${gempaData.Lintang}, ${gempaData.Bujur}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Time Information Card -->
                    <div class="bg-white/70 backdrop-blur-sm rounded-lg p-5">
                        <div class="flex items-start space-x-3">
                            <div class="h-9 w-9 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-clock text-purple-600"></i>
                            </div>
                            <div>
                                <p class="text-lg font-medium text-gray-800">${formattedDateTime}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${
                       gempaData.Dirasakan
                          ? `
                    <div class="bg-white/70 backdrop-blur-sm rounded-lg p-5">
                        <div class="flex items-start space-x-3">
                            <div class="h-9 w-9 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-hand-paper text-yellow-600"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-medium text-yellow-700 mb-1">Felt Reports</h4>
                                <p class="text-gray-800">${gempaData.Dirasakan}</p>
                            </div>
                        </div>
                    </div>
                    `
                          : ""
                    }
                </div>

                <div class="space-y-4">
                    ${
                       shakemapUrl
                          ? `
                    <div class="bg-white/70 backdrop-blur-sm rounded-lg overflow-hidden">
                        <div class="p-3 bg-gradient-to-r from-blue-600 to-blue-500">
                            <h4 class="text-sm font-medium text-white flex items-center">
                                <i class="fas fa-map mr-2"></i>Shakemap
                            </h4>
                        </div>
                        <div class="p-3">
                            <a href="${shakemapUrl}" data-fancybox class="block relative group">
                                <img src="${shakemapUrl}" alt="Earthquake Shakemap" 
                                    class="w-full h-auto rounded-md" 
                                    loading="lazy">
                                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <div class="bg-white/90 rounded-full p-2">
                                        <i class="fas fa-search-plus text-blue-600"></i>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                    `
                          : ""
                    }
                </div>
            </div>
        </div>
    `;

   Fancybox.bind("[data-fancybox]", {
      Image: { zoom: true },
      Toolbar: {
         display: {
            left: ["infobar"],
            middle: [
               "zoomIn",
               "zoomOut",
               "toggle1to1",
               "rotateCCW",
               "rotateCW",
            ],
            right: ["slideshow", "thumbs", "close"],
         },
      },
      Thumbs: { showOnStart: false },
      Carousel: {
         transition: "fade",
         friction: 0.8,
      },
      Image: {
         zoom: true,
         protect: true,
         animationEffect: "fade",
      },
   });

   latestGempaInfo.classList.add("animate-shake");
   setTimeout(() => {
      latestGempaInfo.classList.remove("animate-shake");
   }, 1000);
}

function createFeltEarthquakesTable(data) {
   const tbody = document.querySelector("#gempa-dirasakan-table tbody");
   if (!tbody) {
      console.error("Felt earthquakes table not found in the document");
      return;
   }

   tbody.innerHTML = "";

   data.forEach((gempaData) => {
      const dateTime = parseDateTime(gempaData.Tanggal, gempaData.Jam);
      const formattedDateTime = dateTime.isValid
         ? dateTime.toFormat("dd MMM yyyy HH:mm 'WIB'")
         : gempaData.Tanggal + " " + gempaData.Jam;

      const row = document.createElement("tr");
      row.className =
         "hover:bg-blue-50/80 transition-colors border-b border-gray-200";

      row.innerHTML = `
         <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-3">
               <span class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
               <span class="text-sm text-gray-800 font-medium">${formattedDateTime}</span>
            </div>
         </td>
         <td class="px-6 py-4 whitespace-nowrap">
            <span class="text-sm text-gray-700 font-medium">${
               gempaData.Lintang
            }, ${gempaData.Bujur}</span>
         </td>
         <td class="px-6 py-4 text-center">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
               parseFloat(gempaData.Magnitude) >= 5
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
            }">
               ${gempaData.Magnitude} SR
            </span>
         </td>
         <td class="px-6 py-4 text-center">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700">
               ${gempaData.Kedalaman}
            </span>
         </td>
         <td class="px-6 py-4">
            <div class="text-sm text-gray-800">${formatRegion(
               gempaData.Wilayah
            )}</div>
         </td>
         <td class="px-6 py-4">
            <div class="text-sm font-medium ${
               gempaData.Dirasakan ? "text-amber-700" : "text-gray-500"
            } max-w-xs">
               ${gempaData.Dirasakan || "No impact reports"}
            </div>
         </td>
      `;

      tbody.appendChild(row);
   });
}

function createTable(data, tableType = "recent") {
   const tableId =
      tableType === "recent" ? "gempa-table" : "gempa-dirasakan-table";
   const tbody = document.querySelector(`#${tableId} tbody`);

   if (!tbody) {
      console.error(`Table with id '${tableId}' not found in the document`);
      return;
   }

   tbody.innerHTML = "";

   data.forEach((gempaData) => {
      const dateTime = parseDateTime(gempaData.Tanggal, gempaData.Jam);
      const formattedDateTime = dateTime.isValid
         ? dateTime.toFormat("dd MMM yyyy HH:mm 'WIB'")
         : gempaData.Tanggal + " " + gempaData.Jam;

      const magnitude = parseFloat(gempaData.Magnitude);
      const row = document.createElement("tr");
      row.className =
         "hover:bg-red-50/70 transition-colors border-b border-gray-200";

      row.innerHTML = `
            <td class="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2 sm:space-x-3">
                    <span class="w-2 sm:w-3 h-2 sm:h-3 bg-red-500 rounded-full ${
                       magnitude >= 5 ? "animate-pulse" : ""
                    }"></span>
                    <span class="text-xs sm:text-sm text-gray-800 font-medium">${formattedDateTime}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-700 font-medium">${
                   gempaData.Lintang
                }, ${gempaData.Bujur}</span>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                   magnitude >= 6
                      ? "bg-red-100 text-red-700"
                      : magnitude >= 5
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                }">
                    ${gempaData.Magnitude} SR
                </span>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700">
                    ${gempaData.Kedalaman}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-800">${formatRegion(
                   gempaData.Wilayah
                )}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm font-medium ${
                   gempaData.Potensi ? "text-red-700" : "text-gray-500"
                } max-w-xs">
                    ${gempaData.Potensi || "No potential impact"}
                </div>
            </td>
        `;

      tbody.appendChild(row);
   });
}

// Add this new helper function to format region text
function formatRegion(region) {
   // Split location components and format them
   const parts = region.split(",").map((part) => part.trim());
   if (parts.length > 1) {
      return parts
         .map((part, index) => {
            if (index === parts.length - 1) {
               return `<span class="font-medium text-blue-700">${part}</span>`;
            }
            return part;
         })
         .join("<br>");
   }
   return region;
}

function createTimelineChart(earthquakes) {
   const ctx = document.getElementById("timelineChart").getContext("2d");
   const validEarthquakes = earthquakes.filter((eq) => {
      const dateTime = parseDateTime(eq.Tanggal, eq.Jam, eq.DateTime);
      return dateTime.isValid;
   });

   const chartData = validEarthquakes.map((eq) => {
      const dateTime = parseDateTime(eq.Tanggal, eq.Jam, eq.DateTime);
      return {
         x: dateTime.toJSDate(),
         y: parseFloat(eq.Magnitude),
         location: eq.Wilayah,
      };
   });

   chartData.sort((a, b) => a.x - b.x);

   if (timelineChart instanceof Chart) {
      timelineChart.destroy();
   }

   timelineChart = new Chart(ctx, {
      type: "line",
      data: {
         datasets: [
            {
               label: "Earthquake Magnitude",
               data: chartData,
               borderColor: "#3b82f6", // Tailwind blue-500
               backgroundColor: "#93c5fd", // Tailwind blue-300
               borderWidth: 2,
               pointRadius: 3,
               pointHoverRadius: 5,
               pointBackgroundColor: "#3b82f6", // Tailwind blue-500
               pointHoverBackgroundColor: "#1d4ed8", // Tailwind blue-700
               pointBorderColor: "#ffffff",
               pointHoverBorderColor: "#ffffff",
               tension: 0.1,
            },
         ],
      },
      options: {
         responsive: true,
         maintainAspectRatio: false,
         scales: {
            x: {
               type: "time",
               time: {
                  unit: "day",
                  displayFormats: {
                     day: "MMM d",
                  },
               },
               title: {
                  display: true,
                  text: "Date",
                  color: "#4b5563", // Tailwind gray-600
                  font: {
                     family: "Inter, sans-serif",
                     size: 12,
                     weight: "bold",
                  },
               },
               ticks: {
                  color: "#6b7280", // Tailwind gray-500
                  font: {
                     family: "Inter, sans-serif",
                     size: 10,
                  },
                  maxRotation: 45,
                  minRotation: 45,
               },
               grid: {
                  color: "#e5e7eb", // Tailwind gray-200
               },
            },
            y: {
               beginAtZero: true,
               title: {
                  display: true,
                  text: "Magnitude",
                  color: "#4b5563", // Tailwind gray-600
                  font: {
                     family: "Inter, sans-serif",
                     size: 12,
                     weight: "bold",
                  },
               },
               ticks: {
                  color: "#6b7280", // Tailwind gray-500
                  font: {
                     family: "Inter, sans-serif",
                     size: 10,
                  },
               },
               grid: {
                  color: "#e5e7eb", // Tailwind gray-200
               },
            },
         },
         plugins: {
            tooltip: {
               backgroundColor: "rgba(255, 255, 255, 0.95)",
               titleColor: "#1f2937",
               bodyColor: "#4b5563",
               borderColor: "#e5e7eb",
               borderWidth: 1,
               titleFont: {
                  family: "Inter, sans-serif",
                  size: 13,
                  weight: "600",
               },
               bodyFont: {
                  family: "Inter, sans-serif",
                  size: 12,
               },
               padding: 12,
               boxPadding: 6,
               usePointStyle: true,
               boxWidth: 8,
               callbacks: {
                  title: function (tooltipItems) {},
                  label: function (context) {
                     return `Magnitude: ${context.parsed.y.toFixed(1)}`;
                  },
                  afterLabel: function (context) {
                     return `Location: ${
                        chartData[context.dataIndex].location
                     }`;
                  },
               },
            },
            legend: {
               display: false,
            },
         },
         interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false,
         },
      },
   });
}

function updateTime() {
   const now = new Date();
   const localOptions = {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
   };
   const utcOptions = {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
   };

   document.getElementById("localTime").textContent =
      now.toLocaleTimeString("id-ID", localOptions) + " WIB";
   document.getElementById("utcTime").textContent =
      now.toLocaleTimeString("en-US", utcOptions) + " UTC";
}

function showErrorMessage(message) {
   const errorDiv = document.createElement("div");
   errorDiv.className =
      "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4";
   errorDiv.role = "alert";
   errorDiv.innerHTML = `
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline">${message}</span>
    `;
   document.querySelector("main").prepend(errorDiv);
   setTimeout(() => {
      errorDiv.remove();
   }, 5000);
}

// Main functions
function getGempaInfo() {
   updateGempaData(
      "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.xml",
      false
   );
}

function getLatestGempaInfo() {
   updateGempaData("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.xml", true);
}

// Add this new function for responsive map handling
function handleResponsiveMap() {
   if (map) {
      setTimeout(() => {
         map.invalidateSize();
      }, 100);
   }
}

// Event listeners and initialization
document.addEventListener("DOMContentLoaded", () => {
   initMap();
   updateAllEarthquakeData();
   getLatestGempaInfo();
   setInterval(getLatestGempaInfo, 300000); // 5 minutes
   setInterval(throttledUpdate, 900000); // 15 minutes
   setInterval(updateTime, 1000);
   updateTime(); // Initial call
   window.addEventListener("resize", _.debounce(handleResponsiveMap, 250));
});

// Service Worker Registration
if ("serviceWorker" in navigator) {
   window.addEventListener("load", function () {
      navigator.serviceWorker.register("/service-worker.js").then(
         function (registration) {
            console.log(
               "ServiceWorker registration successful with scope: ",
               registration.scope
            );
         },
         function (err) {
            console.log("ServiceWorker registration failed: ", err);
         }
      );
   });
}
