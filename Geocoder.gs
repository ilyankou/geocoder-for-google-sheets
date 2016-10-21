var ui = SpreadsheetApp.getUi();
var addressColumn = 1;
var latColumn = 2;
var lngColumn = 3;
var foundAddressColumn = 4;
var qualityColumn = 5;
var sourceColumn = 6;

googleGeocoder = Maps.newGeocoder().setRegion(
  PropertiesService.getDocumentProperties().getProperty('GEOCODING_REGION') || 'us'
);

function geocode(source) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var cells = sheet.getActiveRange();

  if (cells.getNumColumns() != 6) {
    ui.alert(
      'Warning',
      'You must select 6 columns: Address, Latitude, Longitude, Found Address, Geocode Quaity, Geocode Source',
      ui.ButtonSet.OK
    );
    return;
  }

  var nAll = 0;
  var nFailure = 0;
  var quality;

  for (addressRow = 1; addressRow <= cells.getNumRows(); addressRow++) {
    var address = cells.getCell(addressRow, addressColumn).getValue();

    if (!address) {continue;}
    nAll++;

    if (source == 'US Census') {
      nFailure += withUSCensus(cells, address);
    } else {
      nFailure += withGoogle(cells, address);
    }
  }

  ui.alert('Completed!', 'Geocoded: ' + (nAll - nFailure)
    + '\nFailed: ' + nFailure, ui.ButtonSet.OK);
}


function withGoogle(cells, address) {
  location = googleGeocoder.geocode(address);

  if (location.status !== 'OK') {
    cells.getCell(addressRow, qualityColumn).setValue('No Match');
    cells.getCell(addressRow, sourceColumn).setValue('Google');
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

  cells.getCell(addressRow, latColumn).setValue(lat);
  cells.getCell(addressRow, lngColumn).setValue(lng);
  cells.getCell(addressRow, foundAddressColumn).setValue(foundAddress);
  cells.getCell(addressRow, qualityColumn).setValue(quality);
  cells.getCell(addressRow, sourceColumn).setValue('Google');

  return 0;
}


function withUSCensus(cells, address) {
  var url = 'https://geocoding.geo.census.gov/'
          + 'geocoder/locations/onelineaddress?address='
          + encodeURIComponent(address)
          + '&benchmark=Public_AR_Current&format=json';

  var response = JSON.parse(UrlFetchApp.fetch(url));

  var matches = (response.result.addressMatches.length > 0) ? 'Match' : 'No Match';

  if (matches !== 'Match') {
    cells.getCell(addressRow, qualityColumn).setValue('No Match');
    cells.getCell(addressRow, sourceColumn).setValue('US Census');
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

  cells.getCell(addressRow, foundAddressColumn).setValue(z.matchedAddress);
  cells.getCell(addressRow, latColumn).setValue(z.coordinates.y);
  cells.getCell(addressRow, lngColumn).setValue(z.coordinates.x);
  cells.getCell(addressRow, qualityColumn).setValue(quality);
  cells.getCell(addressRow, sourceColumn).setValue('US Census');

  return 0;
}


function censusAddressToPosition() {
  geocode('US Census');
}

function googleAddressToPosition() {
  geocode('Google');
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
  ];

  return entries;
}

function updateMenu() {
  SpreadsheetApp.getActiveSpreadsheet().updateMenu('Geocoder', generateMenu());
}

function onOpen() {
  SpreadsheetApp.getActiveSpreadsheet().addMenu('Geocoder', generateMenu());
}
