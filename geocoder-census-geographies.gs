var ui = SpreadsheetApp.getUi();

var addressColumn = 1;
var latColumn = 2;
var lngColumn = 3;
var foundAddressColumn = 4;
var qualityColumn = 5;
var sourceColumn = 6;
var geoIdColumn = 7;
var tractColumn = 8;

/**
 * Use US Census geocoder
 */
function geocode() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var cells = sheet.getActiveRange();

  if (cells.getNumColumns() != 8) {
    ui.alert(
      'Warning',
      'You must select 8 columns: Location, Latitude, Longitude, Found, Quality, Source, GeoID, Tract',
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

    nFailure += withUSCensus(cells, addressRow, address);
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
          + '&vintage=Current_Current'
          + '&benchmark=Public_AR_Current'
          + '&format=json';

  var response = JSON.parse(UrlFetchApp.fetch(url));
  var matches = (response.result.addressMatches.length > 0) ? 'Match' : 'No Match';

  if (matches !== 'Match') {
    insertDataIntoSheet(cells, row, [
      [foundAddressColumn, ''],
      [latColumn, ''],
      [lngColumn, ''],
      [qualityColumn, 'No Match'],
      [sourceColumn, '']
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
    [sourceColumn, 'US Census 2010'],
    [geoIdColumn, z.geographies['2010 Census Blocks'][0].GEOID],
    [tractColumn, z.geographies['Census Tracts'][0].BASENAME]
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

function onOpen() {
  ui.createMenu('Geocoder')
   .addItem('US Census 2010 Geographies', 'geocode')
   .addToUi();
}
