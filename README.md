# Jetset

Jetset is a simple webapp to visualize all of the flights you've taken. You can feed a csv file of your flights into the app and it will generate an interactive map of all of your flights. See https://louim.github.io/jetset for a demo with sample data.

## Feeding your data to Jetset

You can add the `data_url` parameter to the url to automatically load your data into the app. For example, if your data is hosted at `https://example.com/flights.csv`, you can load it into the app by going to `https://louim.github.io/jetset/?data_url=https://example.com/flights.csv`.

## Data format

The data should be in a csv file with the following columns: "Trip Name","Date","Origin","Destination" eg:

```csv
"Walt Disney World 2006","2006-03-05","YUL","LGA"
```

Format:

- Trip Name: The name of the trip. Can be anything you want.
- Date: The date of the flight in the format YYYY-MM-DD.
- Origin: The IATA code of the origin airport.
- Destination: The IATA code of the destination airport.

© Louis-Michel Couture 2023

## Running locally

Start a web server in the root directory of the project.

```bash
npx http-server
```
