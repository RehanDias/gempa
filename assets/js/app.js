const DateTime = luxon.DateTime;

let map;
let markers = [];
let timelineChart;

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
   try {
      const response = await fetch(url);
      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      return Array.from(xmlDoc.querySelectorAll("gempa")).map((item) => ({
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
      }));
   } catch (error) {
      console.error("Error fetching earthquake data:", error);
      showErrorMessage(
         "Failed to load earthquake data. Please try again later."
      );
      return [];
   }
}

async function updateAllEarthquakeData() {
   try {
      const feltEarthquakes = await fetchGempaData(
         "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.xml"
      );
      const recentLargeEarthquakes = await fetchGempaData(
         "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.xml"
      );

      createFeltEarthquakesTable(feltEarthquakes);
      createTable(recentLargeEarthquakes);
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

// UI update functions
function createLatestGempaInfo(gempaData) {
   const latestGempaInfo = document.getElementById("latest-gempa-info");
   const dateTime = parseDateTime(gempaData.Tanggal, gempaData.Jam);
   const formattedDateTime = dateTime.isValid
      ? dateTime.toFormat("dd MMM yyyy HH:mm 'WIB'")
      : "Invalid Date";
   latestGempaInfo.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="space-y-6">
                <h3 class="text-2xl md:text-3xl font-semibold text-bmkg-blue tracking-tight"><i class="fas fa-clipboard-list mr-2"></i>Earthquake Details</h3>
                <div class="bg-gray-50 p-4 md:p-6 rounded-lg shadow-inner">
                    <p class="mb-3 text-sm"><i class="far fa-clock mr-2"></i><span class="font-medium">Date & Time:</span> ${formattedDateTime}</p>
                    <p class="mb-3 text-sm"><i class="fas fa-map-marker-alt mr-2"></i><span class="font-medium">Location:</span> ${
                       gempaData.Lintang
                    }, ${gempaData.Bujur}</p>
                    <p class="mb-3 text-sm"><i class="fas fa-ruler mr-2"></i><span class="font-medium">Magnitude:</span> <span class="text-bmkg-red font-bold text-xl">${
                       gempaData.Magnitude
                    }</span></p>
                    <p class="mb-3 text-sm"><i class="fas fa-level-down-alt mr-2"></i><span class="font-medium">Depth:</span> ${
                       gempaData.Kedalaman
                    }</p>
                    <p class="mb-3 text-sm"><i class="fas fa-map mr-2"></i><span class="font-medium">Region:</span> ${
                       gempaData.Wilayah
                    }</p>
                    <p class="mb-3 text-sm"><i class="fas fa-exclamation-triangle mr-2"></i><span class="font-medium">Potential:</span> ${
                       gempaData.Potensi
                    }</p>
                    ${
                       gempaData.Dirasakan
                          ? `<p class="mb-3 text-sm"><i class="fas fa-hand-paper mr-2"></i><span class="font-medium">Felt:</span> ${gempaData.Dirasakan}</p>`
                          : ""
                    }
                </div>
            </div>
            ${
               gempaData.Shakemap
                  ? `
            <div>
                <h3 class="text-2xl md:text-3xl font-semibold mb-6 text-bmkg-blue tracking-tight"><i class="fas fa-map-marked-alt mr-2"></i>Shakemap</h3>
                <div class="relative aspect-w-16 aspect-h-9">
                    <div class="absolute inset-0 flex items-center justify-center bg-gray-200 rounded" id="shakemap-loading">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bmkg-blue"></div>
                    </div>
                    <a href="https://static.bmkg.go.id/${gempaData.Shakemap}" 
                       data-fancybox="shakemap" 
                       class="shakemap-thumbnail block">
                        <img src="https://static.bmkg.go.id/${gempaData.Shakemap}" 
                             alt="Shakemap" 
                             class="w-full h-full object-cover rounded shadow-sm transition-opacity duration-300 opacity-0 hover:opacity-90"
                             loading="lazy"
                             onload="this.classList.remove('opacity-0'); document.getElementById('shakemap-loading').classList.add('hidden');">
                    </a>
                </div>
            </div>
            `
                  : ""
            }
        </div>
    `;

   Fancybox.bind("[data-fancybox]", {
      Image: { zoom: false },
      Toolbar: {
         display: { left: [], middle: [], right: ["close"] },
      },
      Thumbs: { showOnStart: false },
      Carousel: { transition: "fade" },
   });

   latestGempaInfo.classList.add("animate-shake");
   setTimeout(() => {
      latestGempaInfo.classList.remove("animate-shake");
   }, 1000);
}

function createFeltEarthquakesTable(data) {
   const tbody = document.querySelector("#gempa-dirasakan-table tbody");
   tbody.innerHTML = "";

   data.forEach((gempaData, index) => {
      const row = document.createElement("tr");
      row.className = `hover:bg-gray-50 transition-colors duration-200 ${
         index % 2 === 0 ? "bg-gray-100" : ""
      }`;

      const dateTime = parseDateTime(gempaData.Tanggal, gempaData.Jam);
      const formattedDateTime = dateTime.isValid
         ? dateTime.toFormat("dd MMM yyyy HH:mm 'WIB'")
         : gempaData.Tanggal + " " + gempaData.Jam;

      row.innerHTML = `
            <td class="py-4 px-4 text-sm">${formattedDateTime}</td>
            <td class="py-4 px-4 text-sm">${gempaData.Lintang}, ${gempaData.Bujur}</td>
            <td class="py-4 px-4 font-semibold text-bmkg-red text-sm">${gempaData.Magnitude}</td>
            <td class="py-4 px-4 text-sm">${gempaData.Kedalaman}</td>
            <td class="py-4 px-4 text-sm">${gempaData.Wilayah}</td>
            <td class="py-4 px-4 text-sm">${gempaData.Dirasakan}</td>
        `;

      tbody.appendChild(row);
   });
}

function createTable(data) {
   const tbody = document.querySelector("#gempa-table tbody");
   tbody.innerHTML = "";

   data.forEach((gempaData, index) => {
      const row = document.createElement("tr");
      row.className = `hover:bg-gray-50 transition-colors duration-200 ${
         index % 2 === 0 ? "bg-gray-100" : ""
      }`;

      const dateTime = parseDateTime(gempaData.Tanggal, gempaData.Jam);
      const formattedDateTime = dateTime.isValid
         ? dateTime.toFormat("dd MMM yyyy HH:mm 'WIB'")
         : gempaData.Tanggal + " " + gempaData.Jam;

      row.innerHTML = `
            <td class="py-4 px-4 text-sm">${formattedDateTime}</td>
            <td class="py-4 px-4 text-sm">${gempaData.Lintang}, ${gempaData.Bujur}</td>
            <td class="py-4 px-4 font-semibold text-bmkg-red text-sm">${gempaData.Magnitude}</td>
            <td class="py-4 px-4 text-sm">${gempaData.Kedalaman}</td>
            <td class="py-4 px-4 text-sm">${gempaData.Wilayah}</td>
            <td class="py-4 px-4 text-sm">${gempaData.Potensi}</td>
        `;

      tbody.appendChild(row);
   });
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
               backgroundColor: "#ffffff",
               titleColor: "#111827", // Tailwind gray-900
               bodyColor: "#4b5563", // Tailwind gray-600
               borderColor: "#e5e7eb", // Tailwind gray-200
               borderWidth: 1,
               titleFont: {
                  family: "Inter, sans-serif",
                  size: 12,
                  weight: "bold",
               },
               bodyFont: {
                  family: "Inter, sans-serif",
                  size: 11,
               },
               padding: 8,
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

// Event listeners and initialization
document.addEventListener("DOMContentLoaded", () => {
   initMap();
   updateAllEarthquakeData();
   getLatestGempaInfo();
   setInterval(getLatestGempaInfo, 300000); // 5 minutes
   setInterval(updateAllEarthquakeData, 900000); // 15 minutes
   setInterval(updateTime, 1000);
   updateTime(); // Initial call
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
