var ui = SpreadsheetApp.getUi();
var addressColumn = 1;
var latColumn = 2;
var lngColumn = 3;
var foundAddressColumn = 4;
var qualityColumn = 5;
var sourceColumn = 6;
var mapzenKey = '';

googleGeocoder = Maps.newGeocoder().setRegion(
  PropertiesService.getDocumentProperties().getProperty('GEOCODING_REGION') || 'us'
);

function geocode(source) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var cells = sheet.getActiveRange();

  if (cells.getNumColumns() != 6) {
    ui.alert(
      'Warning',
      'You must select 6 columns: Address, Latitude, Longitude, Found Address, Geocode Quality, Geocode Source',
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
 * Geocode address using Google Maps API
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
 * Geocoding with US Census
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
 * Geocoding with Mapzen
 */
function withMapzen(cells, row, address) {
   var url = 'https://search.mapzen.com/v1/search?'
          + 'api_key=' + mapzenKey
          + '&text=' + encodeURIComponent(address)
          /**
           * Possible sources are:
           * -OpenAddresses: oa
           * -OpenStreetMap: osm
           * -Who's On First: wof
           * -GeoNames: gn
           */
          + '&sources=oa'
          + '&size=1';

  var response = JSON.parse(UrlFetchApp.fetch(url, {muteHttpExceptions: true}));

  // If repsonse is an HTTP exception, print it and exit with code 2 so that
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
      [sourceColumn, 'Mapzen']
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
    [sourceColumn, 'Mapzen']
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

function mapzenAddressToPosition() {
  mapzenKey = ui.prompt('Insert Mapzen Key:').getResponseText();
  geocode('Mapzen');
}


function generateMenu() {
  var entries = [
    {
      name: 'with US Census (Public Address Current)',
      functionName: 'censusAddressToPosition'
    },
    {
      name: "with Google Maps",
      functionName: "googleAddressToPosition"
    },
    {
      name: "with Mapzen (OpenAddresses)",
      functionName: "mapzenAddressToPosition"
    },
  ];

  return entries;
}

function updateMenu() {
  SpreadsheetApp.getActiveSpreadsheet().updateMenu('Geocoder', generateMenu());
}

function onOpen() {
  SpreadsheetApp.getActiveSpreadsheet().addMenu('Geocoder', generateMenu());
}
