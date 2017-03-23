var ui = SpreadsheetApp.getUi();

var addressColumn = 1;
var latColumn = 2;
var lngColumn = 3;
var foundAddressColumn = 4;
var qualityColumn = 5;
var sourceColumn = 6;
var benchmarkColumn = 7;
var geographyColumn = 8;
var blockGeoIdColumn = 9;
var tractColumn = 10;

var benchmark = '';
var vintage = '';

function geocode() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var cells = sheet.getActiveRange();

  if (cells.getNumColumns() != 10) {
    ui.alert(
      'Warning',
      'You must select 10 columns: Location, Latitude, Longitude, Found, Quality, Source, Benchmark, Vintage, BlockGeoId, Tract',
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
          + '&vintage=' + vintage
          + '&benchmark=' + benchmark
          + '&format=json';

  var response = JSON.parse(UrlFetchApp.fetch(url));
  var matches = (response.result.addressMatches.length > 0) ? 'Match' : 'No Match';

  if (matches !== 'Match') {
    insertDataIntoSheet(cells, row, [
      [foundAddressColumn, ''],
      [latColumn, ''],
      [lngColumn, ''],
      [qualityColumn, 'No Match'],
      [sourceColumn, 'US Census'],
      [benchmarkColumn, ''],
      [geographyColumn, ''],
      [tractColumn, ''],
      [blockGeoIdColumn, '']
    ]);
    return 1;
  }



  var z = response.result.addressMatches[0];
  Logger.log(z);

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
    [benchmarkColumn, benchmark],
    [geographyColumn, vintage],
    [blockGeoIdColumn, z.geographies['Census Tracts'][0].GEOID],
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

function cur_cur_cur()          {benchmark = 'Public_AR_Current'; vintage = 'Current_Current'; geocode();} // 2010 Census Blocks
function cur_2010_cur()         {benchmark = 'Public_AR_Current'; vintage = 'Census2010_Current'; geocode();} // Census Blocks
function cur_2013_cur()         {benchmark = 'Public_AR_Current'; vintage = 'ACS2013_Current'; geocode();}
function cur_2014_cur()         {benchmark = 'Public_AR_Current'; vintage = 'ACS2014_Current'; geocode();}
function cur_2015_cur()         {benchmark = 'Public_AR_Current'; vintage = 'ACS2015_Current'; geocode();}
function cur_2016_cur()         {benchmark = 'Public_AR_Current'; vintage = 'ACS2016_Current'; geocode();}

function acs2016_cur_2016()     {benchmark = 'Public_AR_ACS2016'; vintage = 'Current_ACS2016'; geocode();}
function acs2016_2010_2016()    {benchmark = 'Public_AR_ACS2016'; vintage = 'ACS2010_ACS2016'; geocode();}
function acs2016_2013_2016()    {benchmark = 'Public_AR_ACS2016'; vintage = 'ACS2013_ACS2016'; geocode();}
function acs2016_2014_2016()    {benchmark = 'Public_AR_ACS2016'; vintage = 'ACS2014_ACS2016'; geocode();}
function acs2016_2015_2016()    {benchmark = 'Public_AR_ACS2016'; vintage = 'ACS2015_ACS2016'; geocode();}
function acs2016_2016_2016()    {benchmark = 'Public_AR_ACS2016'; vintage = 'ACS2016_ACS2016'; geocode();}

function census2010_2010_2010() {benchmark = 'Public_AR_Census2010'; vintage = 'Census2010_Census2010'; geocode();}
function census2010_2000_2010() {benchmark = 'Public_AR_Census2010'; vintage = 'Census2000_Census2010'; geocode();}

function onOpen() {
  ui.createMenu('US Census')
   .addSubMenu(ui.createMenu('Public AR Current')
     .addItem('Current_Current', 'cur_cur_cur')
     .addItem('Census2010_Current', 'cur_2010_cur')
     .addItem('ACS2013_Current', 'cur_2013_cur')
     .addItem('ACS2014_Current', 'cur_2014_cur')
     .addItem('ACS2015_Current', 'cur_2015_cur')
     .addItem('ACS2016_Current', 'cur_2016_cur'))
   .addSubMenu(ui.createMenu('Public AR ACS2016')
     .addItem('Current_ACS2016', 'acs2016_cur_2016')
     .addItem('Census2010_ACS2016', 'acs2016_2010_2016')
     .addItem('ACS2013_ACS2016', 'acs2016_2013_2016')
     .addItem('ACS2014_ACS2016', 'acs2016_2014_2016')
     .addItem('ACS2015_ACS2016', 'acs2016_2015_2016')
     .addItem('ACS2016_ACS2016', 'acs2016_2016_2016'))
   .addSubMenu(ui.createMenu('Public AR Census 2010')
     .addItem('Census2010_Census2010', 'census2010_2010_2010')
     .addItem('Census2000_Census2010', 'census2010_2000_2010'))
   .addToUi();
}
