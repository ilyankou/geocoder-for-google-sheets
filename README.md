# google sheets geocoder
Geocode addresses into latitude/longitude coordinates inside Google Sheets, with US Census or Google Apps service

## Credits (and licenses)
- Developed by [Ilya Ilyankou](https://github.com/ilyankou) and [Jack Dougherty](https://github.com/jackdougherty) with support from Trinity College CT, for [Leaflet Maps with Google Sheets](https://github.com/jackdougherty/leaflet-maps-with-google-sheets). Learn more in [Data Visualization For All tutorial](https://www.datavizforall.org/leaflet/with-google-sheets/)
- Inspired by Google Sheets Geocoding Macro (2016) https://github.com/nuket/google-sheets-geocoding-macro (no license)
- Geocoding services:
  - Geocode with US Census Geocoder, set to Public Address Current data. Limited to 1,000 searches per batch.  https://geocoding.geo.census.gov/geocoder/
  - Geocode with Google Apps: The Maps Service of Google Apps allows users to geocode street addresses without using the Google Maps API. Limited to 1,000 searches per user per day.  https://developers.google.com/apps-script/reference/maps/geocoder

## Make and run your own copy
- Method 1: Copy template
  - Go to the Google Sheet template in the [Leaflet Maps with Google Sheets] tutorial(https://www.datavizforall.org/leaflet/with-google-sheets/)
  - Sign in to your Google account
  - File > Make a Copy, to save to your Google Drive
  - In the Points tab, select 6 columns (Address thru Source), and select Geocoder menu
  - Grant permission to run the first time

- Method 2: Insert script into any Google Sheet
  - Go to your Google Sheets > Tools > Script Editor
  - File > Create New Script File
  - Copy and paste contents of Geocoder.js.gs
  - Save as Geocoder.js.gs
  - In your Google Sheet, select 6 columns (Address thru Source), and select Geocoder menu
  - Grant permission to run the first time

## Under development
- Geocoder-with-Mapzen.gs -- need to focus search within a country or prioritize area https://mapzen.com/documentation/search/search/#search-within-a-particular-country
