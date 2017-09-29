var ui = SpreadsheetApp.getUi();
var addressColumn = 1;
var latColumn = 2;
var lngColumn = 3;
var foundAddressColumn = 4;
var qualityColumn = 5;
var sourceColumn = 6;

var mapzenKey = '';
var mapzenSource = '';
var mapzenRegion = '';

googleGeocoder = Maps.newGeocoder().setRegion(
  PropertiesService.getDocumentProperties().getProperty('GEOCODING_REGION') || 'us'
);

function geocode(source) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var cells = sheet.getActiveRange();

  if (cells.getNumColumns() != 6) {
    ui.alert(
      'Warning',
      'You must select 6 columns: Location, Latitude, Longitude, Found, Match Quality, Source',
      ui.ButtonSet.OK
    );
    return;
  }

  var nAll = 0;
  var nFailure = 0;
  var quality;
  var printComplete = true;

  for (addressRow = 1; addressRow <= cells.getNumRows(); addressRow++) {
    var address = cells.getCell(addressRow, addressColumn).getValue();

    if (!address) {continue}
    nAll++;

    if (source == 'US Census') {
      nFailure += withUSCensus(cells, addressRow, address);
    } else if (source == 'Google') {
      nFailure += withGoogle(cells, addressRow, address);
    } else if (source == 'Mapzen') {
      code = withMapzen(cells, addressRow, address);
      if (code == 2) {
        printComplete = false;
        break;
      }
      nFailure += code;
    }
  }

  if (printComplete) {
    ui.alert('Completed!', 'Geocoded: ' + (nAll - nFailure)
    + '\nFailed: ' + nFailure, ui.ButtonSet.OK);
  }

}

/**
 * Geocode address with Google Apps https://developers.google.com/apps-script/reference/maps/geocoder
 */
function withGoogle(cells, row, address) {
  location = googleGeocoder.geocode(address);

  if (location.status !== 'OK') {
    insertDataIntoSheet(cells, row, [
      [foundAddressColumn, ''],
      [latColumn, ''],
      [lngColumn, ''],
      [qualityColumn, 'No Match'],
      [sourceColumn, 'Google']
    ]);

    return 1;
  }

  lat = location['results'][0]['geometry']['location']['lat'];
  lng = location['results'][0]['geometry']['location']['lng'];
  foundAddress = location['results'][0]['formatted_address'];

  var quality;
  if (location['results'][0]['partial_match']) {
    quality = 'Partial Match';
  } else {
    quality = 'Match';
  }

  insertDataIntoSheet(cells, row, [
    [foundAddressColumn, foundAddress],
    [latColumn, lat],
    [lngColumn, lng],
    [qualityColumn, quality],
    [sourceColumn, 'Google']
  ]);

  return 0;
}

/**
 * Geocoding with US Census Geocoder https://geocoding.geo.census.gov/geocoder/
 */
function withUSCensus(cells, row, address) {
  var url = 'https://geocoding.geo.census.gov/'
          + 'geocoder/locations/onelineaddress?address='
          + encodeURIComponent(address)
          + '&benchmark=Public_AR_Current&format=json';

  var response = JSON.parse(UrlFetchApp.fetch(url));
  var matches = (response.result.addressMatches.length > 0) ? 'Match' : 'No Match';

  if (matches !== 'Match') {
    insertDataIntoSheet(cells, row, [
      [foundAddressColumn, ''],
      [latColumn, ''],
      [lngColumn, ''],
      [qualityColumn, 'No Match'],
      [sourceColumn, 'US Census']
    ]);
    return 1;
  }

  var z = response.result.addressMatches[0];

  var quality;
  if (address.toLowerCase().replace(/[,\']/g, '') ==
      z.matchedAddress.toLowerCase().replace(/[,\']/g, '')) {
        quality = 'Exact';
  } else {
    quality = 'Match';
  }

  insertDataIntoSheet(cells, row, [
    [foundAddressColumn, z.matchedAddress],
    [latColumn, z.coordinates.y],
    [lngColumn, z.coordinates.x],
    [qualityColumn, quality],
    [sourceColumn, 'US Census']
  ]);

  return 0;
}

/**
 * Geocoding with Mapzen Search https://mapzen.com/documentation/search/search/
 */
function withMapzen(cells, row, address) {
   var url = 'https://search.mapzen.com/v1/search?'
          + 'api_key=' + mapzenKey
          + '&text=' + encodeURIComponent(address)
          + '&sources=' + mapzenSource
          + '&size=1';

  if (mapzenRegion != '') {
    url += '&boundary.country=' + mapzenRegion;
  }

  var response = JSON.parse(UrlFetchApp.fetch(url, {muteHttpExceptions: true}));

  // If response is an HTTP exception, print it and exit with code 2 so that
  // geocoding won't continue
  if (response.results) {
    if (response.results.error) {
      ui.alert('Error', response.results.error.message, ui.ButtonSet.OK);
      return 2;
    }
  }

  if (response.features.length == 0) {
    insertDataIntoSheet(cells, row, [
      [foundAddressColumn, ''],
      [latColumn, ''],
      [lngColumn, ''],
      [qualityColumn, 'No Match'],
      [sourceColumn, 'Mapzen ' + mapzenSource.toUpperCase()]
    ]);
    return 1;
  }

  var lat = response.features[0].geometry.coordinates[0];
  var lng = response.features[0].geometry.coordinates[1];
  var confidence = response.features[0].properties.confidence;
  var address = response.features[0].properties.label;

  insertDataIntoSheet(cells, row, [
    [foundAddressColumn, address],
    [latColumn, lat],
    [lngColumn, lng],
    [qualityColumn, confidence],
    [sourceColumn, 'Mapzen ' + mapzenSource.toUpperCase()]
  ]);

  return 0;
}

/**
 * Sets cells from a 'row' to values in data
 */
function insertDataIntoSheet(cells, row, data) {
  for (d in data) {
    cells.getCell(row, data[d][0]).setValue(data[d][1]);
  }
}

function censusAddressToPosition() {
  geocode('US Census');
}

function googleAddressToPosition() {
  geocode('Google');
}

function mapzen() {
  mapzenKey = ui.prompt('Insert Mapzen Key:').getResponseText();
  mapzenRegion = ui.prompt('Country code (e.g. GBR, USA, DEU, CAN, CHN):').getResponseText();
  geocode('Mapzen');
}

function mapzenOA() {
  mapzenSource = 'oa';
  mapzen();
}

function mapzenOSM() {
  mapzenSource = 'osm';
  mapzen();
}

function onOpen() {
  ui.createMenu('Geocoder')
   .addItem('with US Census (limit 1000 per batch)', 'censusAddressToPosition')
   .addItem('with Google (limit 1000 per day)', 'googleAddressToPosition')
   .addSubMenu(ui.createMenu('with Mapzen (requires API key)')
     .addItem('OpenAddress', 'mapzenOA')
     .addItem('OpenStreetMap', 'mapzenOSM'))
   .addToUi();
}
