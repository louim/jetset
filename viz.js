const MAP_CENTER = { lat: 46.8570237, lng: -71.5097226, altitude: 0.8 };
const OPACITY = 0.4;

const initializeGlobeVisualization = () => {
  loadAirportsAndRoutes()
    .then(({ airports, routes }) => {
      const uniqueTrips = getUniqueTrips(routes);
      populateTripFilter(uniqueTrips, myGlobe);
      addTripFilterEventListener(myGlobe, routes);

      const filteredAirports = filterAirportsByRoutes(airports, routes);
      const byIata = indexAirportsByIata(filteredAirports);

      const filteredRoutes = mapRoutesToAirports(routes, byIata);

      renderGlobeVisualization(myGlobe, filteredAirports, filteredRoutes);
    })
    .catch((error) => {
      console.error("Failed to initialize globe visualization:", error);
    });
};

const createGlobeVisualization = () =>
  Globe()(document.getElementById("globeViz"))
    .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
    .arcLabel((d) => `${d.trip}: ${d.srcIata} &#8594; ${d.dstIata}`)
    .arcStartLat((d) => d.srcAirport.lat)
    .arcStartLng((d) => d.srcAirport.lng)
    .arcEndLat((d) => d.dstAirport.lat)
    .arcEndLng((d) => d.dstAirport.lng)
    .arcAltitudeAutoScale(0.3)
    .arcColor((d) => [
      `rgba(0, 255, 0, ${OPACITY})`,
      `rgba(255, 0, 0, ${OPACITY})`,
    ])
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcStroke(0.4)
    .arcDashAnimateTime(3000)
    .onArcHover((hoverArc) =>
      myGlobe.arcColor((d) => {
        const op = !hoverArc ? OPACITY : d === hoverArc ? 0.9 : OPACITY / 4;
        return [`rgba(0, 255, 0, ${op})`, `rgba(255, 0, 0, ${op})`];
      })
    )
    .pointColor(() => "orange")
    .pointAltitude(0)
    .pointRadius(0.1)
    .pointsMerge(true);

const myGlobe = createGlobeVisualization();

const loadAirportsAndRoutes = async () => {
  const airportsPromise = fetch("airports.csv")
    .then((res) => res.text())
    .then((d) => d3.csvParseRows(d, airportParse));

  const routesPromise = fetch("data.csv")
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
    const filteredRoutesByTrip = selectedTrip
      ? routes.filter((d) => d.trip === selectedTrip)
      : routes;

    myGlobe.arcsData(filteredRoutesByTrip);
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
