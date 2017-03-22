var ui = SpreadsheetApp.getUi();

var addressColumn = 1;
var latColumn = 2;
var lngColumn = 3;
var foundAddressColumn = 4;
var qualityColumn = 5;
var sourceColumn = 6;
var stateColumn = 7;
var countyColumn = 8;
var tractColumn = 9;
var blockColumn = 10;

googleGeocoder = Maps.newGeocoder().setRegion(
  PropertiesService.getDocumentProperties().getProperty('GEOCODING_REGION') || 'us'
);

function geocode(source) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var cells = sheet.getActiveRange();

  if (cells.getNumColumns() != 10) {
    ui.alert(
      'Warning',
      'You must select 10 columns: Location, Latitude, Longitude, Found, Quality, Source, State, County, Tract, Block',
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
    }
  }

  if (printComplete) {
    ui.alert('Completed!', 'Geocoded: ' + (nAll - nFailure)
    + '\nFailed: ' + nFailure, ui.ButtonSet.OK);
  }
}

/**
 * Geocoding with US Census Geocoder https://geocoding.geo.census.gov/geocoder/
 */
function withUSCensus(cells, row, address) {
  var url = 'https://geocoding.geo.census.gov/'
          + 'geocoder/geographies/onelineaddress?address='
          + encodeURIComponent(address)
          + '&benchmark=Public_AR_Current&format=json';

  var response = JSON.parse(UrlFetchApp.fetch(url));
  ui.alert(response.result);
  var matches = (response.result.addressMatches.length > 0) ? 'Match' : 'No Match';

  if (matches !== 'Match') {
    insertDataIntoSheet(cells, row, [
      [foundAddressColumn, ''],
      [latColumn, ''],
      [lngColumn, ''],
      [qualityColumn, 'No Match'],
      [sourceColumn, 'US Census'],
      [stateColumn, ''],
      [countyColumn, ''],
      [tractColumn, ''],
      [blockColumn, '']
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
    [sourceColumn, 'US Census'],
    [stateColumn, z.state],
    [countyColumn, ],
    [blockColumn, ],
    [tractColumn, ]
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

function onOpen() {
  ui.createMenu('Geocoder')
   .addItem('with US Census (limit 1000 per batch)', 'censusAddressToPosition')
   .addToUi();
}
