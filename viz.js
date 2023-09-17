const MAP_CENTER = { lat: 46.8570237, lng: -71.5097226, altitude: 0.8 };
const OPACITY = 0.4;
const nextButton = document.getElementById("nextButton");
const prevButton = document.getElementById("prevButton");
const toggleButton = document.getElementById("toggleButton");

let currentSegmentIndex = 0;
let filteredRoutesByTrip = [];
let showAllRoutes = true;

const handleSegmentChange = (filteredRoutesByTrip, myGlobe) => {
  myGlobe.arcsData([filteredRoutesByTrip[currentSegmentIndex]]);
  // Center camera on selected route
  const route = filteredRoutesByTrip[currentSegmentIndex];
  const src = route.srcAirport;
  const dst = route.dstAirport;
  const interpolated = d3.geoInterpolate(
    [src.lng, src.lat],
    [dst.lng, dst.lat]
  )(0.5);
  const midpoint = {
    lat: interpolated[1],
    lng: interpolated[0],
    altitude: 1,
  };
  myGlobe.pointOfView(midpoint, 2000);

  // Disable prevButton if there is no previous segment
  if (currentSegmentIndex === 0) {
    prevButton.disabled = true;
  } else {
    prevButton.disabled = false;
  }

  // Disable nextButton if there is no next segment
  if (currentSegmentIndex === filteredRoutesByTrip.length - 1) {
    nextButton.disabled = true;
  } else {
    nextButton.disabled = false;
  }
};

const handleToggleChange = (myGlobe) => {
  // Toggle between showing all routes and showing one route at a time
  showAllRoutes = !showAllRoutes;
  if (showAllRoutes) {
    // Restore normal behavior
    myGlobe
      .arcsData(filteredRoutesByTrip)
      .arcColor(arcColor)
      .onArcHover(onArcHover);
    toggleButton.textContent = "Enable Navigation Mode";
    toggleButton.classList.remove("error");
    toggleButton.classList.add("success");
    nextButton.disabled = true;
    prevButton.disabled = true;
  } else {
    // Show one route at a time
    myGlobe
      .arcsData([filteredRoutesByTrip[currentSegmentIndex]])
      .arcColor((d) => [`rgba(0, 255, 0, 1)`, `rgba(255, 0, 0, 1)`])
      .onArcHover(null);
    toggleButton.textContent = "Disable Navigation Mode";
    toggleButton.classList.remove("success");
    toggleButton.classList.add("error");
    nextButton.disabled = false;
    prevButton.disabled = true;
    handleSegmentChange(filteredRoutesByTrip, myGlobe);
  }
};

nextButton.addEventListener("click", () => {
  if (!showAllRoutes && currentSegmentIndex < filteredRoutesByTrip.length - 1) {
    currentSegmentIndex++;
    handleSegmentChange(filteredRoutesByTrip, myGlobe);
  }
});

prevButton.addEventListener("click", () => {
  if (!showAllRoutes && currentSegmentIndex > 0) {
    currentSegmentIndex--;
    handleSegmentChange(filteredRoutesByTrip, myGlobe);
  }
});

toggleButton.addEventListener("click", () => {
  handleToggleChange(myGlobe);
});

const initializeGlobeVisualization = () => {
  loadAirportsAndRoutes()
    .then(({ airports, routes }) => {
      const uniqueTrips = getUniqueTrips(routes);
      populateTripFilter(uniqueTrips, myGlobe);
      addTripFilterEventListener(myGlobe, routes);

      const filteredAirports = filterAirportsByRoutes(airports, routes);
      const byIata = indexAirportsByIata(filteredAirports);

      const filteredRoutes = mapRoutesToAirports(routes, byIata);
      filteredRoutesByTrip = filteredRoutes;

      renderGlobeVisualization(myGlobe, filteredAirports, filteredRoutes);
    })
    .catch((error) => {
      console.error("Failed to initialize globe visualization:", error);
    });
};

const arcColor = (d) => [
  `rgba(0, 255, 0, ${OPACITY})`,
  `rgba(255, 0, 0, ${OPACITY})`,
];

const onArcHover = (hoverArc) =>
  myGlobe.arcColor((d) => {
    const op = !hoverArc ? OPACITY : d === hoverArc ? 0.9 : OPACITY / 4;
    return [`rgba(0, 255, 0, ${op})`, `rgba(255, 0, 0, ${op})`];
  });

const createGlobeVisualization = () =>
  Globe()(document.getElementById("globeViz"))
    .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
    .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
    .arcLabel((d) => `${d.trip}: ${d.srcIata} &#8594; ${d.dstIata}`)
    .arcStartLat((d) => d.srcAirport.lat)
    .arcStartLng((d) => d.srcAirport.lng)
    .arcEndLat((d) => d.dstAirport.lat)
    .arcEndLng((d) => d.dstAirport.lng)
    .arcAltitudeAutoScale(0.3)
    .arcColor(arcColor)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcStroke(0.4)
    .arcDashAnimateTime(3000)
    .onArcHover(onArcHover)
    .pointColor(() => "orange")
    .pointAltitude(0)
    .pointRadius(0.1)
    .pointsMerge(true);

const myGlobe = createGlobeVisualization();

const loadAirportsAndRoutes = async () => {
  const airportsPromise = fetch("airports.csv")
    .then((res) => res.text())
    .then((d) => d3.csvParseRows(d, airportParse));

  // If we have a dataUrl query parameter, use it to fetch the data.
  // Otherwise, use the default data.csv file.
  const urlParams = new URLSearchParams(window.location.search);
  const dataUrl = urlParams.get("data_url");
  const routesUrl = dataUrl ? dataUrl : "data.csv";
  const routesPromise = fetch(routesUrl)
    .then((res) => res.text())
    .then((d) => d3.csvParseRows(d, routeParse));

  const [airports, routes] = await Promise.all([
    airportsPromise,
    routesPromise,
  ]);
  return { airports, routes };
};

const airportParse = ([
  id,
  ident,
  type,
  name,
  latitude_deg,
  longitude_deg,
  elevation_ft,
  continent,
  iso_country,
  iso_region,
  municipality,
  scheduled_service,
  gps_code,
  iata_code,
  local_code,
  home_link,
  wikipedia_link,
  keywords,
]) => ({
  airportId: id,
  ident,
  type,
  name,
  lat: parseFloat(latitude_deg),
  lng: parseFloat(longitude_deg),
  alt: parseFloat(elevation_ft),
  continent,
  country: iso_country,
  region: iso_region,
  city: municipality,
  scheduledService: scheduled_service,
  gpsCode: gps_code,
  iata: iata_code,
  localCode: local_code,
  homeLink: home_link,
  wikipediaLink: wikipedia_link,
  keywords,
});
const routeParse = ([trip, date, srcIata, dstIata]) => ({
  trip,
  date,
  srcIata,
  dstIata,
});

const getUniqueTrips = (routes) => [...new Set(routes.map((d) => d.trip))];

const populateTripFilter = (uniqueTrips, myGlobe) => {
  const tripFilterSelect = document.getElementById("tripFilter");

  uniqueTrips.forEach((trip) => {
    const option = document.createElement("option");
    option.value = trip;
    option.textContent = trip;
    tripFilterSelect.appendChild(option);
  });
};

const addTripFilterEventListener = (myGlobe, routes) => {
  const tripFilterSelect = document.getElementById("tripFilter");
  tripFilterSelect.addEventListener("change", () => {
    const selectedTrip = tripFilterSelect.value;
    filteredRoutesByTrip = selectedTrip
      ? routes.filter((d) => d.trip === selectedTrip)
      : routes;
    currentSegmentIndex = 0;
    if (showAllRoutes) {
      myGlobe.arcsData(filteredRoutesByTrip);
      nextButton.disabled = true;
      prevButton.disabled = true;
    } else {
      handleSegmentChange(filteredRoutesByTrip, myGlobe);
    }
  });
};

const filterAirportsByRoutes = (airports, routes) => {
  const iataSet = new Set(
    routes.map((d) => d.srcIata).concat(routes.map((d) => d.dstIata))
  );
  return airports.filter((d) => iataSet.has(d.iata));
};

const indexAirportsByIata = (airports) => indexBy(airports, "iata", false);

const mapRoutesToAirports = (routes, byIata) =>
  routes
    .filter(
      (d) =>
        byIata.hasOwnProperty(d.srcIata) && byIata.hasOwnProperty(d.dstIata)
    ) // exclude unknown airports
    .map((d) =>
      Object.assign(d, {
        srcAirport: byIata[d.srcIata],
        dstAirport: byIata[d.dstIata],
      })
    );

const renderGlobeVisualization = (
  myGlobe,
  filteredAirports,
  filteredRoutes
) => {
  myGlobe
    .pointsData(filteredAirports)
    .arcsData(filteredRoutes)
    .pointOfView(MAP_CENTER, 4000);
};

window.addEventListener("resize", (event) => {
  myGlobe.width([event.target.innerWidth]);
  myGlobe.height([event.target.innerHeight]);
});
