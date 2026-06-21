import json, re, math, random
from pathlib import Path

US_ROWS = r'''
Washington DC|DC|38.907|-77.037|city
Old Town Alexandria|VA|38.804|-77.047|historic
Arlington Virginia|VA|38.881|-77.091|city
Manassas Battlefield|VA|38.815|-77.522|historic
Richmond|VA|37.541|-77.436|city
Charlottesville|VA|38.030|-78.477|college
Shenandoah National Park|VA|38.533|-78.350|mountain
Luray Caverns|VA|38.665|-78.459|mountain
Williamsburg|VA|37.271|-76.707|historic
Virginia Beach|VA|36.852|-75.978|beach
Norfolk|VA|36.850|-76.285|city
Chincoteague Island|VA|37.934|-75.378|island
Roanoke|VA|37.271|-79.941|mountain
Smith Mountain Lake|VA|37.071|-79.580|lake
Mabry Mill Blue Ridge|VA|36.748|-80.405|mountain
Annapolis|MD|38.978|-76.492|historic
Baltimore Inner Harbor|MD|39.290|-76.612|city
Ocean City Maryland|MD|38.336|-75.084|beach
Deep Creek Lake|MD|39.512|-79.324|lake
St Michaels Maryland|MD|38.785|-76.224|historic
Frederick Maryland|MD|39.414|-77.410|historic
Assateague Island|MD|38.087|-75.209|island
Harpers Ferry|WV|39.326|-77.739|historic
Snowshoe Mountain|WV|38.410|-79.997|ski
New River Gorge|WV|38.070|-81.083|mountain
Charleston West Virginia|WV|38.349|-81.632|city
Dolly Sods Wilderness|WV|39.033|-79.350|mountain
Canaan Valley|WV|39.058|-79.440|mountain
Philadelphia|PA|39.952|-75.165|city
Pittsburgh|PA|40.441|-79.996|city
Hershey|PA|40.286|-76.650|theme
Lancaster Pennsylvania|PA|40.038|-76.305|historic
Gettysburg|PA|39.830|-77.231|historic
Poconos|PA|41.052|-75.329|mountain
Jim Thorpe Pennsylvania|PA|40.875|-75.732|historic
State College|PA|40.793|-77.860|college
Lake Erie Pennsylvania|PA|42.129|-80.085|lake
Rehoboth Beach|DE|38.720|-75.077|beach
Lewes Delaware|DE|38.774|-75.139|beach
Wilmington Delaware|DE|39.744|-75.548|city
Cape May|NJ|38.935|-74.906|beach
Atlantic City|NJ|39.364|-74.422|beach
Asbury Park|NJ|40.220|-74.012|beach
Princeton|NJ|40.357|-74.668|college
Hoboken|NJ|40.744|-74.032|city
New York City|NY|40.713|-74.006|city
Brooklyn|NY|40.678|-73.944|city
The Hamptons|NY|40.963|-72.185|beach
Montauk|NY|41.036|-71.955|beach
Hudson Valley|NY|41.748|-73.985|historic
Catskills|NY|42.214|-74.215|mountain
Lake Placid|NY|44.279|-73.979|lake
Saratoga Springs|NY|43.083|-73.784|historic
Niagara Falls New York|NY|43.097|-79.037|waterfall
Buffalo|NY|42.886|-78.878|city
Rochester New York|NY|43.156|-77.608|city
Finger Lakes|NY|42.780|-76.800|lake
Ithaca|NY|42.444|-76.501|college
Syracuse|NY|43.048|-76.147|city
Albany New York|NY|42.652|-73.757|historic
Boston|MA|42.360|-71.058|city
Cambridge Massachusetts|MA|42.373|-71.109|college
Cape Cod|MA|41.668|-70.296|beach
Martha's Vineyard|MA|41.380|-70.645|island
Nantucket|MA|41.283|-70.099|island
Salem Massachusetts|MA|42.519|-70.896|historic
Berkshires|MA|42.311|-73.248|mountain
Providence|RI|41.824|-71.412|city
Newport Rhode Island|RI|41.490|-71.313|beach
Block Island|RI|41.171|-71.557|island
Mystic Connecticut|CT|41.354|-71.966|historic
New Haven|CT|41.308|-72.927|college
Hartford|CT|41.765|-72.673|city
Portland Maine|ME|43.659|-70.256|city
Bar Harbor|ME|44.388|-68.204|beach
Acadia National Park|ME|44.338|-68.274|mountain
Kennebunkport|ME|43.362|-70.477|beach
Burlington Vermont|VT|44.476|-73.212|lake
Stowe Vermont|VT|44.465|-72.687|ski
Woodstock Vermont|VT|43.624|-72.519|historic
White Mountains New Hampshire|NH|44.270|-71.303|mountain
Portsmouth New Hampshire|NH|43.071|-70.763|historic
Manchester New Hampshire|NH|42.995|-71.455|city
Charlotte|NC|35.227|-80.843|city
Raleigh|NC|35.779|-78.639|city
Durham North Carolina|NC|35.994|-78.899|college
Chapel Hill|NC|35.913|-79.056|college
Asheville|NC|35.595|-82.552|mountain
Outer Banks|NC|35.558|-75.466|beach
Wilmington North Carolina|NC|34.210|-77.887|beach
Boone North Carolina|NC|36.216|-81.674|mountain
Great Smoky Mountains NC|NC|35.611|-83.489|mountain
Greensboro|NC|36.073|-79.792|city
Greenville North Carolina|NC|35.613|-77.366|college
Charleston South Carolina|SC|32.776|-79.931|historic
Myrtle Beach|SC|33.689|-78.887|beach
Hilton Head Island|SC|32.216|-80.752|island
Greenville South Carolina|SC|34.852|-82.394|city
Columbia South Carolina|SC|34.001|-81.034|college
Kiawah Island|SC|32.608|-80.085|resort
Savannah|GA|32.080|-81.091|historic
Atlanta|GA|33.749|-84.388|city
Athens Georgia|GA|33.951|-83.357|college
Blue Ridge Georgia|GA|34.863|-84.324|mountain
Jekyll Island|GA|31.068|-81.412|island
Tybee Island|GA|32.000|-80.845|beach
Augusta Georgia|GA|33.473|-82.010|sports
Orlando|FL|28.538|-81.379|theme
Miami|FL|25.762|-80.192|city
Miami Beach|FL|25.790|-80.130|beach
Key West|FL|24.555|-81.780|island
Fort Lauderdale|FL|26.122|-80.137|beach
Palm Beach|FL|26.705|-80.037|beach
Naples Florida|FL|26.142|-81.795|beach
Sarasota|FL|27.336|-82.531|beach
Tampa|FL|27.951|-82.457|city
St Petersburg Florida|FL|27.767|-82.640|beach
Clearwater Beach|FL|27.978|-82.827|beach
Destin|FL|30.394|-86.495|beach
Panama City Beach|FL|30.176|-85.805|beach
Pensacola Beach|FL|30.334|-87.139|beach
St Augustine|FL|29.902|-81.312|historic
Jacksonville|FL|30.332|-81.656|city
Amelia Island|FL|30.669|-81.463|island
Everglades National Park|FL|25.286|-80.899|woods
Gulf Shores|AL|30.246|-87.700|beach
Birmingham Alabama|AL|33.519|-86.810|city
Mobile Alabama|AL|30.695|-88.039|historic
Huntsville Alabama|AL|34.730|-86.586|city
Tuscaloosa|AL|33.209|-87.569|college
New Orleans|LA|29.951|-90.072|city
Baton Rouge|LA|30.451|-91.187|college
Lafayette Louisiana|LA|30.224|-92.020|historic
Lake Charles|LA|30.226|-93.218|lake
Nashville|TN|36.162|-86.781|city
Memphis|TN|35.149|-90.049|city
Gatlinburg|TN|35.715|-83.511|mountain
Pigeon Forge|TN|35.789|-83.555|theme
Chattanooga|TN|35.045|-85.310|mountain
Knoxville|TN|35.961|-83.921|college
Louisville|KY|38.252|-85.758|city
Lexington Kentucky|KY|38.040|-84.504|college
Mammoth Cave|KY|37.187|-86.101|woods
Bowling Green Kentucky|KY|36.968|-86.480|city
Cincinnati|OH|39.103|-84.512|city
Columbus Ohio|OH|39.961|-82.999|college
Cleveland|OH|41.499|-81.694|city
Cedar Point|OH|41.482|-82.683|theme
Hocking Hills|OH|39.426|-82.551|woods
Detroit|MI|42.331|-83.046|city
Ann Arbor|MI|42.280|-83.743|college
Grand Rapids Michigan|MI|42.963|-85.668|city
Traverse City|MI|44.763|-85.620|lake
Mackinac Island|MI|45.849|-84.618|island
Sleeping Bear Dunes|MI|44.882|-86.044|beach
Indianapolis|IN|39.768|-86.158|sports
Bloomington Indiana|IN|39.165|-86.526|college
South Bend|IN|41.677|-86.252|college
French Lick|IN|38.548|-86.619|resort
Chicago|IL|41.878|-87.630|city
Springfield Illinois|IL|39.782|-89.650|historic
Champaign Urbana|IL|40.110|-88.207|college
Galena Illinois|IL|42.416|-90.429|historic
Milwaukee|WI|43.038|-87.907|city
Madison Wisconsin|WI|43.073|-89.401|college
Wisconsin Dells|WI|43.627|-89.771|theme
Door County|WI|45.053|-87.124|lake
Minneapolis|MN|44.977|-93.265|city
Duluth Minnesota|MN|46.786|-92.100|lake
Boundary Waters|MN|47.946|-91.496|lake
Rochester Minnesota|MN|44.012|-92.480|city
St Louis|MO|38.627|-90.199|city
Kansas City Missouri|MO|39.099|-94.579|city
Branson Missouri|MO|36.643|-93.218|shows
Lake of the Ozarks|MO|38.199|-92.639|lake
Columbia Missouri|MO|38.951|-92.334|college
Omaha|NE|41.256|-95.934|city
Lincoln Nebraska|NE|40.813|-96.702|college
Kansas City Kansas|KS|39.115|-94.627|sports
Lawrence Kansas|KS|38.972|-95.235|college
Wichita|KS|37.688|-97.330|city
Oklahoma City|OK|35.468|-97.516|city
Tulsa|OK|36.154|-95.992|city
Norman Oklahoma|OK|35.222|-97.439|college
Broken Bow Oklahoma|OK|34.029|-94.739|lake
Dallas|TX|32.777|-96.797|city
Fort Worth|TX|32.755|-97.331|city
Austin|TX|30.267|-97.743|city
San Antonio|TX|29.424|-98.494|historic
Houston|TX|29.760|-95.370|city
Galveston|TX|29.301|-94.798|beach
Corpus Christi|TX|27.801|-97.396|beach
South Padre Island|TX|26.111|-97.169|island
Fredericksburg Texas|TX|30.275|-98.872|wine
Waco|TX|31.549|-97.147|college
College Station|TX|30.628|-96.334|college
Big Bend National Park|TX|29.127|-103.242|desert
Marfa|TX|30.309|-104.021|desert
Little Rock|AR|34.746|-92.290|city
Hot Springs Arkansas|AR|34.503|-93.055|resort
Fayetteville Arkansas|AR|36.063|-94.157|college
Eureka Springs|AR|36.401|-93.738|historic
Denver|CO|39.739|-104.990|city
Boulder|CO|40.015|-105.270|mountain
Colorado Springs|CO|38.834|-104.821|mountain
Rocky Mountain National Park|CO|40.343|-105.683|mountain
Aspen|CO|39.191|-106.817|ski
Vail|CO|39.641|-106.374|ski
Breckenridge|CO|39.481|-106.038|ski
Telluride|CO|37.938|-107.812|ski
Durango Colorado|CO|37.275|-107.880|mountain
Great Sand Dunes|CO|37.791|-105.594|desert
Santa Fe|NM|35.687|-105.938|historic
Albuquerque|NM|35.084|-106.650|city
Taos|NM|36.408|-105.573|mountain
White Sands National Park|NM|32.780|-106.171|desert
Phoenix|AZ|33.448|-112.074|city
Scottsdale|AZ|33.494|-111.926|resort
Sedona|AZ|34.869|-111.761|desert
Grand Canyon|AZ|36.107|-112.113|desert
Flagstaff|AZ|35.198|-111.651|mountain
Tucson|AZ|32.222|-110.974|desert
Page Arizona|AZ|36.915|-111.456|desert
Monument Valley|AZ|36.998|-110.098|desert
Las Vegas|NV|36.170|-115.140|city
Reno|NV|39.529|-119.814|city
Lake Tahoe Nevada|NV|39.096|-120.032|lake
Valley of Fire|NV|36.485|-114.531|desert
Salt Lake City|UT|40.761|-111.891|city
Park City Utah|UT|40.647|-111.498|ski
Moab|UT|38.573|-109.550|desert
Zion National Park|UT|37.298|-113.026|desert
Bryce Canyon|UT|37.593|-112.187|desert
Lake Powell|UT|37.068|-111.244|lake
Boise|ID|43.615|-116.202|city
Sun Valley Idaho|ID|43.697|-114.352|ski
Coeur d'Alene|ID|47.678|-116.780|lake
Jackson Hole|WY|43.479|-110.762|ski
Yellowstone National Park|WY|44.428|-110.588|mountain
Grand Teton National Park|WY|43.790|-110.682|mountain
Cheyenne|WY|41.140|-104.820|historic
Bozeman|MT|45.677|-111.042|mountain
Glacier National Park|MT|48.759|-113.787|mountain
Missoula|MT|46.872|-113.994|college
Big Sky Montana|MT|45.284|-111.401|ski
Billings|MT|45.783|-108.500|city
Seattle|WA|47.606|-122.332|city
Tacoma|WA|47.253|-122.444|city
Olympic National Park|WA|47.802|-123.604|woods
San Juan Islands|WA|48.551|-123.078|island
Leavenworth Washington|WA|47.596|-120.661|mountain
Mount Rainier|WA|46.879|-121.726|mountain
Spokane|WA|47.658|-117.426|city
Portland Oregon|OR|45.515|-122.679|city
Bend Oregon|OR|44.058|-121.315|mountain
Cannon Beach|OR|45.891|-123.961|beach
Crater Lake|OR|42.944|-122.109|lake
Eugene Oregon|OR|44.052|-123.087|college
Hood River|OR|45.705|-121.521|mountain
San Francisco|CA|37.775|-122.419|city
Los Angeles|CA|34.052|-118.244|city
San Diego|CA|32.715|-117.161|beach
Anaheim Disneyland|CA|33.836|-117.914|theme
Santa Monica|CA|34.019|-118.491|beach
Malibu|CA|34.025|-118.779|beach
Santa Barbara|CA|34.420|-119.698|beach
Palm Springs|CA|33.830|-116.545|desert
Joshua Tree|CA|34.135|-116.313|desert
Yosemite National Park|CA|37.865|-119.538|mountain
Lake Tahoe California|CA|39.096|-120.032|lake
Napa Valley|CA|38.503|-122.265|wine
Sonoma|CA|38.292|-122.458|wine
Monterey|CA|36.600|-121.895|beach
Carmel by the Sea|CA|36.555|-121.923|beach
Santa Cruz|CA|36.974|-122.030|beach
Big Sur|CA|36.270|-121.808|beach
Mammoth Lakes|CA|37.649|-118.972|ski
Sacramento|CA|38.581|-121.494|city
San Jose|CA|37.338|-121.886|city
Oakland|CA|37.804|-122.271|city
Huntington Beach|CA|33.660|-117.999|beach
Laguna Beach|CA|33.543|-117.786|beach
Death Valley|CA|36.532|-116.932|desert
Anchorage|AK|61.218|-149.900|city
Denali National Park|AK|63.114|-151.192|mountain
Juneau|AK|58.302|-134.420|cruise
Seward Alaska|AK|60.104|-149.443|cruise
Fairbanks|AK|64.837|-147.716|remote
Honolulu|HI|21.307|-157.858|beach
Maui|HI|20.798|-156.331|island
Kauai|HI|22.097|-159.526|island
Big Island Hawaii|HI|19.542|-155.666|island
Myrtle Beach North End|SC|33.756|-78.794|beach
Avalon New Jersey|NJ|39.101|-74.717|beach
Lake George|NY|43.426|-73.713|lake
Martha Jefferson Wine Country|VA|38.030|-78.477|wine
Plymouth Massachusetts|MA|41.958|-70.668|historic
Ogunquit Maine|ME|43.249|-70.600|beach
Mount Pleasant South Carolina|SC|32.833|-79.828|historic
Beaufort South Carolina|SC|32.431|-80.669|historic
Black Mountain North Carolina|NC|35.617|-82.321|mountain
Blowing Rock|NC|36.135|-81.678|mountain
Cashiers North Carolina|NC|35.112|-83.100|mountain
Highlands North Carolina|NC|35.052|-83.196|mountain
Helen Georgia|GA|34.701|-83.731|mountain
Dahlonega Georgia|GA|34.533|-83.984|wine
Oxford Mississippi|MS|34.366|-89.519|college
Biloxi Mississippi|MS|30.396|-88.885|beach
Jackson Mississippi|MS|32.299|-90.185|city
Orange Beach Alabama|AL|30.269|-87.586|beach
Seaside Florida|FL|30.321|-86.141|beach
Marco Island|FL|25.940|-81.708|island
Sanibel Island|FL|26.449|-82.022|island
Islamorada|FL|24.925|-80.628|island
Vero Beach|FL|27.638|-80.397|beach
Cocoa Beach|FL|28.320|-80.607|beach
Mount Dora Florida|FL|28.802|-81.644|historic
Beaver Creek Colorado|CO|39.604|-106.516|ski
Steamboat Springs|CO|40.485|-106.832|ski
Crested Butte|CO|38.869|-106.987|ski
Ouray Colorado|CO|38.022|-107.671|mountain
Pagosa Springs|CO|37.270|-107.010|resort
Cody Wyoming|WY|44.526|-109.056|historic
Whitefish Montana|MT|48.411|-114.337|ski
Walla Walla|WA|46.064|-118.343|wine
Ashland Oregon|OR|42.194|-122.709|shows
Newport Oregon|OR|44.636|-124.053|beach
Paso Robles|CA|35.627|-120.691|wine
Temecula|CA|33.493|-117.149|wine
Pismo Beach|CA|35.143|-120.641|beach
San Luis Obispo|CA|35.283|-120.659|college
Catalina Island|CA|33.387|-118.416|island
Coronado Island|CA|32.685|-117.183|island
'''

WORLD_ROWS = r'''
Toronto|Canada|43.653|-79.383|city
Montreal|Canada|45.501|-73.567|city
Quebec City|Canada|46.813|-71.208|historic
Vancouver|Canada|49.282|-123.121|city
Whistler|Canada|50.116|-122.957|ski
Banff|Canada|51.178|-115.570|mountain
Jasper|Canada|52.873|-118.082|mountain
Niagara Falls Canada|Canada|43.089|-79.084|waterfall
Ottawa|Canada|45.421|-75.697|city
Calgary|Canada|51.044|-114.071|city
Victoria British Columbia|Canada|48.428|-123.365|island
Prince Edward Island|Canada|46.510|-63.416|island
Mexico City|Mexico|19.432|-99.133|city
Cancun|Mexico|21.161|-86.851|beach
Tulum|Mexico|20.211|-87.466|beach
Playa del Carmen|Mexico|20.629|-87.073|beach
Cozumel|Mexico|20.423|-86.922|island
Cabo San Lucas|Mexico|22.890|-109.916|beach
Puerto Vallarta|Mexico|20.653|-105.225|beach
Guadalajara|Mexico|20.659|-103.349|city
Oaxaca City|Mexico|17.073|-96.726|historic
San Miguel de Allende|Mexico|20.915|-100.744|historic
Merida Mexico|Mexico|20.967|-89.623|historic
Los Cabos|Mexico|23.054|-109.697|resort
Punta Cana|Dominican Republic|18.560|-68.372|beach
Santo Domingo|Dominican Republic|18.486|-69.931|historic
San Juan Puerto Rico|Puerto Rico|18.466|-66.106|historic
Vieques|Puerto Rico|18.126|-65.440|island
Culebra|Puerto Rico|18.310|-65.303|island
Aruba|Aruba|12.521|-69.968|island
Curacao|Curacao|12.169|-68.990|island
Bonaire|Bonaire|12.201|-68.263|island
Nassau Bahamas|Bahamas|25.044|-77.350|beach
Exuma Bahamas|Bahamas|23.619|-75.969|island
Bermuda|Bermuda|32.307|-64.750|island
Montego Bay|Jamaica|18.476|-77.893|beach
Negril|Jamaica|18.268|-78.348|beach
Ocho Rios|Jamaica|18.407|-77.103|beach
Grand Cayman|Cayman Islands|19.313|-81.254|island
Turks and Caicos|Turks and Caicos|21.694|-71.797|island
St Thomas|US Virgin Islands|18.338|-64.894|island
St John USVI|US Virgin Islands|18.335|-64.793|island
St Lucia|Saint Lucia|13.909|-60.979|island
Barbados|Barbados|13.193|-59.543|island
Grenada|Grenada|12.117|-61.679|island
Antigua|Antigua and Barbuda|17.060|-61.796|island
St Martin|Sint Maarten|18.042|-63.054|island
Havana|Cuba|23.113|-82.366|historic
Belize City|Belize|17.504|-88.196|city
Ambergris Caye|Belize|17.921|-87.962|island
San Jose Costa Rica|Costa Rica|9.928|-84.091|city
Arenal Costa Rica|Costa Rica|10.462|-84.704|mountain
Manuel Antonio|Costa Rica|9.389|-84.136|beach
Tamarindo|Costa Rica|10.299|-85.837|beach
Panama City Panama|Panama|8.982|-79.519|city
Cartagena|Colombia|10.391|-75.480|historic
Medellin|Colombia|6.244|-75.581|city
Bogota|Colombia|4.711|-74.072|city
Lima|Peru|-12.046|-77.043|city
Cusco|Peru|-13.532|-71.967|historic
Machu Picchu|Peru|-13.163|-72.545|mountain
Buenos Aires|Argentina|-34.604|-58.382|city
Mendoza|Argentina|-32.889|-68.845|wine
Patagonia Argentina|Argentina|-49.331|-72.886|mountain
Santiago Chile|Chile|-33.448|-70.669|city
Atacama Desert|Chile|-22.908|-68.200|desert
Rio de Janeiro|Brazil|-22.907|-43.173|beach
Sao Paulo|Brazil|-23.555|-46.639|city
Florianopolis|Brazil|-27.595|-48.548|beach
Quito|Ecuador|-0.180|-78.467|historic
Galapagos Islands|Ecuador|-0.829|-90.982|island
London|United Kingdom|51.507|-0.128|city
Edinburgh|United Kingdom|55.953|-3.188|historic
Dublin|Ireland|53.349|-6.260|city
Galway|Ireland|53.270|-9.057|historic
Paris|France|48.857|2.352|city
Nice France|France|43.710|7.262|beach
Bordeaux|France|44.837|-0.579|wine
Lyon|France|45.764|4.835|city
Chamonix|France|45.923|6.869|ski
Provence|France|43.949|4.806|wine
Barcelona|Spain|41.387|2.168|city
Madrid|Spain|40.416|-3.704|city
Seville|Spain|37.389|-5.984|historic
Valencia Spain|Spain|39.470|-0.376|beach
Granada Spain|Spain|37.178|-3.599|historic
Ibiza|Spain|38.907|1.421|island
Mallorca|Spain|39.695|3.017|island
Lisbon|Portugal|38.722|-9.139|city
Porto|Portugal|41.157|-8.629|historic
Algarve|Portugal|37.017|-7.930|beach
Madeira|Portugal|32.760|-16.959|island
Rome|Italy|41.903|12.496|historic
Florence|Italy|43.770|11.255|historic
Venice|Italy|45.440|12.315|historic
Milan|Italy|45.464|9.190|city
Amalfi Coast|Italy|40.634|14.603|beach
Cinque Terre|Italy|44.146|9.654|beach
Lake Como|Italy|45.808|9.085|lake
Tuscany|Italy|43.771|11.248|wine
Sicily|Italy|37.600|14.015|island
Athens|Greece|37.984|23.727|historic
Santorini|Greece|36.393|25.461|island
Mykonos|Greece|37.446|25.328|island
Crete|Greece|35.240|24.809|island
Corfu|Greece|39.624|19.922|island
Reykjavik|Iceland|64.146|-21.942|city
Blue Lagoon Iceland|Iceland|63.880|-22.449|resort
Zurich|Switzerland|47.376|8.541|city
Lucerne|Switzerland|47.050|8.309|lake
Interlaken|Switzerland|46.686|7.863|mountain
Zermatt|Switzerland|46.020|7.749|ski
Geneva|Switzerland|46.204|6.143|city
Vienna|Austria|48.208|16.374|city
Salzburg|Austria|47.809|13.055|historic
Innsbruck|Austria|47.269|11.404|ski
Prague|Czech Republic|50.075|14.438|historic
Budapest|Hungary|47.498|19.040|city
Amsterdam|Netherlands|52.367|4.904|city
Bruges|Belgium|51.209|3.225|historic
Brussels|Belgium|50.847|4.357|city
Berlin|Germany|52.520|13.405|city
Munich|Germany|48.135|11.582|city
Hamburg|Germany|53.551|9.994|city
Copenhagen|Denmark|55.676|12.568|city
Stockholm|Sweden|59.329|18.069|city
Oslo|Norway|59.913|10.752|city
Bergen Norway|Norway|60.392|5.322|mountain
Helsinki|Finland|60.170|24.938|city
Krakow|Poland|50.064|19.945|historic
Warsaw|Poland|52.230|21.012|city
Dubrovnik|Croatia|42.650|18.094|beach
Split Croatia|Croatia|43.508|16.440|beach
Hvar|Croatia|43.172|16.442|island
Kotor|Montenegro|42.424|18.771|historic
Istanbul|Turkey|41.008|28.978|historic
Cappadocia|Turkey|38.643|34.827|desert
Dubai|United Arab Emirates|25.204|55.270|city
Abu Dhabi|United Arab Emirates|24.453|54.377|city
Doha|Qatar|25.285|51.531|city
Jerusalem|Israel|31.768|35.214|historic
Tel Aviv|Israel|32.085|34.782|beach
Petra|Jordan|30.328|35.444|desert
Marrakech|Morocco|31.629|-7.981|historic
Casablanca|Morocco|33.573|-7.590|city
Chefchaouen|Morocco|35.169|-5.263|mountain
Cairo|Egypt|30.044|31.236|historic
Luxor|Egypt|25.687|32.639|historic
Cape Town|South Africa|-33.925|18.424|city
Johannesburg|South Africa|-26.204|28.047|city
Kruger National Park|South Africa|-23.988|31.554|remote
Marrakesh Desert Camp|Morocco|31.100|-4.010|desert
Nairobi|Kenya|-1.292|36.822|city
Maasai Mara|Kenya|-1.406|35.008|remote
Zanzibar|Tanzania|-6.165|39.202|island
Seychelles|Seychelles|-4.679|55.492|island
Mauritius|Mauritius|-20.348|57.552|island
Tokyo|Japan|35.676|139.650|city
Kyoto|Japan|35.011|135.768|historic
Osaka|Japan|34.694|135.502|city
Sapporo|Japan|43.061|141.354|ski
Okinawa|Japan|26.212|127.681|island
Seoul|South Korea|37.566|126.978|city
Busan|South Korea|35.180|129.075|beach
Beijing|China|39.904|116.407|historic
Shanghai|China|31.231|121.474|city
Hong Kong|Hong Kong|22.319|114.169|city
Taipei|Taiwan|25.033|121.565|city
Singapore|Singapore|1.352|103.820|city
Bangkok|Thailand|13.756|100.501|city
Phuket|Thailand|7.880|98.392|island
Chiang Mai|Thailand|18.788|98.985|historic
Koh Samui|Thailand|9.512|100.013|island
Bali|Indonesia|-8.340|115.092|island
Jakarta|Indonesia|-6.208|106.846|city
Kuala Lumpur|Malaysia|3.139|101.687|city
Langkawi|Malaysia|6.350|99.800|island
Hanoi|Vietnam|21.028|105.854|historic
Hoi An|Vietnam|15.880|108.338|historic
Ho Chi Minh City|Vietnam|10.823|106.630|city
Ha Long Bay|Vietnam|20.910|107.183|waterfall
Siem Reap|Cambodia|13.367|103.844|historic
Phnom Penh|Cambodia|11.556|104.928|city
Luang Prabang|Laos|19.886|102.135|historic
Manila|Philippines|14.599|120.984|city
Boracay|Philippines|11.967|121.925|island
Palawan|Philippines|9.834|118.738|island
New Delhi|India|28.613|77.209|city
Jaipur|India|26.912|75.787|historic
Agra|India|27.176|78.008|historic
Goa|India|15.299|74.124|beach
Mumbai|India|19.076|72.878|city
Sri Lanka South Coast|Sri Lanka|6.032|80.217|beach
Maldives|Maldives|3.203|73.220|island
Kathmandu|Nepal|27.717|85.324|mountain
Bhutan Paro|Bhutan|27.430|89.416|mountain
Sydney|Australia|-33.869|151.209|city
Melbourne|Australia|-37.814|144.963|city
Brisbane|Australia|-27.470|153.025|city
Gold Coast Australia|Australia|-28.017|153.400|beach
Great Barrier Reef|Australia|-16.286|145.778|island
Perth|Australia|-31.952|115.861|city
Auckland|New Zealand|-36.850|174.764|city
Queenstown New Zealand|New Zealand|-45.031|168.662|mountain
Rotorua|New Zealand|-38.136|176.249|resort
Fiji|Fiji|-17.713|178.065|island
Tahiti|French Polynesia|-17.650|-149.426|island
Bora Bora|French Polynesia|-16.500|-151.741|island
'''

CAT_PROFILES = {
    'city': {
        'env':['city','sports town'], 'acts':['try new restaurants','visit museums','see the skyline','see shows or theater','go out to clubs or bars','shopping','sports game'], 'lodging':['hotel','boutique inn','Airbnb or VRBO','resort'], 'min':2,'max':8,'budget':220
    },
    'historic': {'env':['historic town','city'], 'acts':['visit museums','historic tours','try new restaurants','see shows or theater','shopping'], 'lodging':['hotel','boutique inn','Airbnb or VRBO','motel'], 'min':2,'max':7,'budget':190},
    'college': {'env':['college town','sports town','city'], 'acts':['sports game','try new restaurants','go out to clubs or bars','visit museums','shopping'], 'lodging':['hotel','motel','Airbnb or VRBO'], 'min':2,'max':5,'budget':160},
    'beach': {'env':['beach','small town'], 'acts':['swim','try new restaurants','find activities for kids','fishing or boating','shopping'], 'lodging':['hotel','resort','Airbnb or VRBO','motel'], 'min':3,'max':10,'budget':260},
    'island': {'env':['island','beach'], 'acts':['swim','fishing or boating','try new restaurants','explore remote areas','find activities for kids'], 'lodging':['resort','hotel','Airbnb or VRBO'], 'min':4,'max':14,'budget':320},
    'mountain': {'env':['mountain','woods'], 'acts':['hike','explore remote areas','extreme sports','try new restaurants','find activities for kids'], 'lodging':['cabin','camping','hotel','Airbnb or VRBO','resort','RV'], 'min':3,'max':12,'budget':210},
    'ski': {'env':['mountain','snow or ski'], 'acts':['extreme sports','hike','try new restaurants','find activities for kids','see shows or theater'], 'lodging':['resort','hotel','cabin','Airbnb or VRBO'], 'min':3,'max':10,'budget':340},
    'lake': {'env':['lake','woods'], 'acts':['swim','fishing or boating','find activities for kids','hike','try new restaurants'], 'lodging':['cabin','camping','RV','Airbnb or VRBO','hotel','resort'], 'min':2,'max':9,'budget':210},
    'woods': {'env':['woods','mountain'], 'acts':['hike','explore remote areas','find activities for kids','fishing or boating'], 'lodging':['cabin','camping','RV','Airbnb or VRBO'], 'min':2,'max':8,'budget':150},
    'desert': {'env':['desert','remote areas'], 'acts':['hike','explore remote areas','extreme sports','try new restaurants','stargazing'], 'lodging':['hotel','resort','camping','Airbnb or VRBO','RV'], 'min':3,'max':9,'budget':240},
    'theme': {'env':['theme park','city'], 'acts':['find activities for kids','theme parks','see shows or theater','try new restaurants','swim'], 'lodging':['hotel','resort','Airbnb or VRBO','motel'], 'min':3,'max':7,'budget':260},
    'resort': {'env':['beach','resort'], 'acts':['swim','try new restaurants','find activities for kids','shopping','fishing or boating'], 'lodging':['resort','hotel','Airbnb or VRBO'], 'min':3,'max':10,'budget':360},
    'wine': {'env':['wine country','small town'], 'acts':['wineries or breweries','try new restaurants','shopping','historic tours'], 'lodging':['boutique inn','hotel','resort','Airbnb or VRBO'], 'min':2,'max':6,'budget':280},
    'sports': {'env':['sports town','city'], 'acts':['sports game','try new restaurants','go out to clubs or bars','see the skyline'], 'lodging':['hotel','Airbnb or VRBO','motel'], 'min':2,'max':5,'budget':190},
    'shows': {'env':['city','small town'], 'acts':['see shows or theater','try new restaurants','find activities for kids','shopping'], 'lodging':['hotel','resort','Airbnb or VRBO'], 'min':2,'max':6,'budget':220},
    'cruise': {'env':['island','beach'], 'acts':['swim','fishing or boating','explore remote areas','try new restaurants'], 'lodging':['cruise','hotel','resort'], 'min':5,'max':14,'budget':300},
    'waterfall': {'env':['woods','lake'], 'acts':['hike','find activities for kids','historic tours','try new restaurants'], 'lodging':['hotel','motel','Airbnb or VRBO','cabin'], 'min':2,'max':6,'budget':180},
    'remote': {'env':['remote areas','woods','mountain'], 'acts':['explore remote areas','hike','stargazing','extreme sports'], 'lodging':['camping','cabin','RV','resort'], 'min':4,'max':14,'budget':230},
}

EXPENSIVE_NAMES = ['New York','Hamptons','Nantucket','Martha','Miami','Key West','Kiawah','Disney','Orlando','Napa','Sonoma','San Francisco','Los Angeles','Malibu','Santa Barbara','Big Sur','Aspen','Vail','Telluride','Jackson','Maui','Kauai','Honolulu','Bora','Maldives','Dubai','London','Paris','Zurich','Santorini','Tokyo','Singapore','Sydney','Whistler','Banff','Cayman','Turks','Bermuda','Aruba','St Lucia','Seychelles','Mauritius']
CHEAP_NAMES = ['Little Rock','Wichita','Tulsa','Oklahoma','Birmingham','Mobile','Jackson Mississippi','Cincinnati','Columbus','Indianapolis','Louisville','Memphis','Buffalo','Rochester','Syracuse','Albany','Greensboro','Columbia South Carolina','Champaign','Springfield','Lafayette','Baton Rouge','Phnom Penh','Hanoi','Hoi An','Chiang Mai','Oaxaca','Merida']

def slug(s):
    return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')

def clean_rows(raw):
    rows=[]
    seen=set()
    for line in raw.strip().splitlines():
        parts=[p.strip() for p in line.split('|')]
        if len(parts)!=5: continue
        name, region, lat, lon, cat=parts
        if name.lower() in seen: continue
        seen.add(name.lower())
        rows.append((name,region,float(lat),float(lon),cat))
    return rows

def enrich(row, domestic):
    name, region, lat, lon, cat = row
    prof = CAT_PROFILES.get(cat, CAT_PROFILES['city'])
    budget = prof['budget']
    if any(x.lower() in name.lower() for x in EXPENSIVE_NAMES): budget += 120
    if any(x.lower() in name.lower() for x in CHEAP_NAMES): budget -= 55
    if not domestic and cat in ['island','beach','resort','ski']: budget += 75
    budget = max(80, int(round(budget/10)*10))
    modes = ['fly']
    if domestic:
        modes += ['drive','train','bus','uber or rideshare','rv']
        if cat in ['island','cruise']: modes += ['cruise']
    else:
        modes += ['cruise'] if cat in ['island','beach','cruise'] else []
        if region in ['Canada','Mexico','Puerto Rico','US Virgin Islands']: modes += ['drive','train','bus'] if region in ['Canada','Mexico'] else []
    if cat in ['woods','lake','mountain','desert','remote']: modes.append('rv')
    return {
        'id': slug(name), 'name': name, 'region': region, 'country': 'United States' if domestic else region,
        'domestic': domestic, 'lat': lat, 'lon': lon, 'category': cat,
        'environments': sorted(set(prof['env'])), 'activities': sorted(set(prof['acts'])),
        'lodging': sorted(set(prof['lodging'])), 'idealMinDays': prof['min'], 'idealMaxDays': prof['max'],
        'sleepBudgetPerNight': budget, 'travelModes': sorted(set(modes)),
        'familyScore': 9 if 'find activities for kids' in prof['acts'] or cat in ['theme','beach','lake'] else 6,
        'nightlifeScore': 9 if cat == 'city' else (7 if cat in ['college','sports','shows'] else 4),
        'remoteScore': 9 if cat in ['remote','mountain','woods','desert','lake'] else 3,
        'summary': make_summary(name, cat, budget)
    }

def make_summary(name, cat, budget):
    templates = {
        'city': f'{name} fits a food, skyline, museums, shows, and sports-style trip.',
        'historic': f'{name} fits a history-heavy trip with walkable streets, museums, tours, and restaurants.',
        'college': f'{name} fits a college-town trip with restaurants, sports energy, bars, and easy weekends.',
        'beach': f'{name} fits a beach trip built around swimming, seafood, kids, and slower days.',
        'island': f'{name} fits a bigger escape with beaches, water activities, and resort-style lodging.',
        'mountain': f'{name} fits hiking, views, cabins, remote areas, and outdoor downtime.',
        'ski': f'{name} fits snow, mountain resorts, winter sports, cabins, and higher lodging costs.',
        'lake': f'{name} fits cabins, boating, swimming, fishing, and family-friendly slow time.',
        'woods': f'{name} fits cabins, camping, RV travel, hiking, and quiet outdoor time.',
        'desert': f'{name} fits open-space hiking, red-rock scenery, remote drives, and stargazing.',
        'theme': f'{name} fits a kid-first trip with theme parks, shows, pools, and easy hotels.',
        'resort': f'{name} fits a higher-comfort trip centered on pools, restaurants, and resort amenities.',
        'wine': f'{name} fits wineries, restaurants, boutique inns, and a slower adult weekend.',
        'sports': f'{name} fits a sports weekend with stadium energy, restaurants, and bars.',
        'shows': f'{name} fits theater, live music, family attractions, and walkable entertainment.',
        'cruise': f'{name} fits cruise-style access, water views, and longer itinerary planning.',
        'waterfall': f'{name} fits scenic views, light hiking, photos, and family-friendly outdoor time.',
        'remote': f'{name} fits remote exploration, stargazing, wilderness, and less crowded travel.',
    }
    return templates.get(cat, f'{name} is a flexible vacation option.') + f' Typical sleep-only budget target: around ${budget}/night.'

us_rows = clean_rows(US_ROWS)
world_rows = clean_rows(WORLD_ROWS)
# Strictly shape to requested database size.
if len(us_rows) < 300 or len(world_rows) < 200:
    raise SystemExit(f'Need more rows: us={len(us_rows)} world={len(world_rows)}')

us_rows = us_rows[:300]
world_rows = world_rows[:200]
all_items = [enrich(r, True) for r in us_rows] + [enrich(r, False) for r in world_rows]
meta = {'total': len(all_items), 'us': len([x for x in all_items if x['domestic']]), 'world': len([x for x in all_items if not x['domestic']])}
Path('/mnt/data/vacation-ai-generator/data/destinations.json').write_text(json.dumps({'meta': meta, 'destinations': all_items}, indent=2), encoding='utf-8')
Path('/mnt/data/vacation-ai-generator/data/destinations.js').write_text('window.VACATION_DESTINATIONS = ' + json.dumps({'meta': meta, 'destinations': all_items}, indent=2) + ';\n', encoding='utf-8')
print(meta)
