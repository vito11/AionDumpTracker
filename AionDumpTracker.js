const Web3 = require('aion-web3')
const fs = require('fs');
var net = require('net');

const web3 = new Web3(new Web3.providers.HttpProvider("https://aion.api.nodesmith.io/v1/mainnet/jsonrpc?apiKey=YOU_API_KEY"));
//const web3 = new Web3(new Web3.providers.IpcProvider("/home/ubuntu/.aion/jsonrpc.ipc",net));


//-------------------------------------------------{Address:Transatcions} Map build functions----------------------------------------------
/**
 * Because searching all transactions via blockchain online is very time consuming
 * Cache all transactions from startBlockNumber to endBlockNumber
 * Return:  A map contains all obtained transactions, map format = {address1:[transctionHash1,transctionHash2,... ],address2:[transctionHash1,transctionHash2,... ],... }
 *  
 */

async function buildAddressMap(startBlockNumber,endBlockNumber) {

      var addressmap = new Map();
      var t1 = new Date().getTime();

      for (var i = startBlockNumber; i <= endBlockNumber; i=i+10) {
        
        var promises = [];

        for(var j = i; j < i+10 && j<=endBlockNumber; j++) {


          if (j % 1000 == 0) {
            console.log("Searching block " + j);
          }

          promises.push(new Promise(function(resolve, reject) {

              web3.eth.getBlock(j, true).then(function(block){
                resolve(block);
              });
            })); 
        }
        
        var blockList = await Promise.all(promises);


        for(var index in blockList){
          var block = blockList[index];

          if (block != null && block.transactions != null) {
          block.transactions.forEach( function(e) { 
              if(e.to !=null){
                var from = e.from.toLocaleLowerCase()
                var to = e.to.toLocaleLowerCase()

                var from_array = addressmap[from];
                if( from_array == null)
                {
                  from_array = new Array();
                }
                from_array.push(e.hash);
                addressmap[from] = from_array;

                var to_array = addressmap[to];
                if( to_array== null)
                {
                  to_array = new Array();
                }
                to_array.push(e.hash);
                addressmap[to] = to_array;
              }  
          });
        }
        }
      }
    var t2 = new Date().getTime();
    console.log(t2-t1);
    return addressmap;

}
/**
 *  Save cached transaction Map into a File
 */
async function saveMap(){

  var latestBlockNumber = await web3.eth.getBlockNumber();

  console.log("latest block number: "+latestBlockNumber);

  var startBlockNumber = 0;
  var endBlockNumber = latestBlockNumber;

  buildAddressMap(startBlockNumber,endBlockNumber).then(function(addressmap){

    var s = JSON.stringify(addressmap);
    var fileName = "map-"+startBlockNumber + "-" + latestBlockNumber;
    fs.writeFile(fileName, s, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
        process.exit(0);
    });

  });
}

/**
 *  Load cached transaction Map from a File
 */
function loadMap(filename){
let content = fs.readFileSync(filename, {encoding: 'utf8'});
console.log("Load file complete!");
var map =JSON.parse(content);
console.log("Parse map complete!");
return map;
}

//-------------------------------------------------Track functions----------------------------------------------

var depositStory = new Map();
var route = [];
var hasTraced = [];
/**
 * Find all transactions paths from srcAddress to desAddress
 * 
 * E.g. traceTransactions(cachedMap, TRS address, Binance hot wallet address) will find all paths from TRS address to Binance hot wallet address,
 * 
 * The result is stored in depositStory Map with the following format : 
 * 
 * {binance_deposit_address1: [TRS address, path_node1, path_node2,..., binance_deposit_address1], ...} 
 * 
 * Please notice that because this track process is very time consuming, so I add a limitation that only searching path with transmit value > 100,000
 * 
 */
async function traceTransactions(map,srcAddress,desAddress) {

  
  var transactionHashArray = map[srcAddress];

  // recursive stop condition

  if(transactionHashArray == null || transactionHashArray.length == 0){
     return;
  }

  if(route.includes(srcAddress))
  {
    return;
  }

  route.push(srcAddress);

  // if there are more than one transaction sent from srcAddress to a certain desAddress, 
  // we only push one trasantion with the biggest transmit value into destransactions map
  // Format: {desAddress: Max_transmit_value, ...}

  var destransactions = {};
  for(var i=0;i<transactionHashArray.length;i++){
    var transactionHash = transactionHashArray[i];
    var transaction = await web3.eth.getTransaction(transactionHash);
    var from = transaction.from.toLocaleLowerCase();
    if(transaction.to != null){
      var to = transaction.to.toLocaleLowerCase();
      if(from == srcAddress){
        var _value = parseFloat(web3.utils.fromNAmp(transaction.value, 'aion'));
        var value =  destransactions[to];
        if(value == null)
        {
          destransactions[to] = _value;
        }
        else
        { if(_value > value){
            destransactions[to] = _value;
          }
        }
      }
    }
  }
  var keys = Object.keys(destransactions);

  for(var i=0;i < keys.length;i++){
      // check if has arrived the desAddress
      if(keys[i] == desAddress ){

        var route_detail = route.slice();

        depositStory[srcAddress] = route_detail;
        route.pop();
        return;
      }
      // recursive 
      if(!hasTraced.includes(keys[i]) && destransactions[keys[i]] > 100000){
         await traceTransactions(map,keys[i],desAddress);
         hasTraced.push(keys[i]);
      }
  }
  var address = route.pop();

}

/**
 * 
 * collect all outgoing transactions from deposite Addresses to binance hot wallet Address
 * 
 * Return dumpStory format: {deposite Addresses:[{time: dump_amout},{time: dump_amout},..., total_dump_amount],...}
 */
async function collectDepositeDetail(map, depositeAddresses, hotAddress){
  var dumpStory = {};

  for(var i=0;i<depositeAddresses.length;i++){
    var depositeAddress = depositeAddresses[i];
    var transactionHashArray = map[depositeAddress];
    var _dump = [];
    var total = 0;

    for(var j=0;j<transactionHashArray.length;j++){
      var transactionHash = transactionHashArray[j];
      var transaction = await web3.eth.getTransaction(transactionHash);
      var from = transaction.from.toLocaleLowerCase();
      var to = transaction.to.toLocaleLowerCase();

      if(from == depositeAddress && to == hotAddress){
    
          var value = web3.utils.fromNAmp(transaction.value, 'aion');
          var block = await web3.eth.getBlock(transaction.blockNumber, true);
          total = total + parseFloat(value);
          var time = new Date(block.timestamp * 1000).toGMTString();
          _dump.push([time,value]);
          
      }
    }

    _dump.push(total);
    dumpStory[depositeAddress] = _dump;
  }

  return dumpStory;

}




//saveMap();
var map = loadMap("map-0-4002918");

const binanceHotAddress = "0xa0efb50bb6da136d1257e1a52411c9f3fd154b8d69ce7f381a28dc01c5aeef78";
const TRS_Address = "0xa0764dea1db22fa5e24895b746f8dd1825029d49e431cac570b4c3b4bf8b2995";

//4 main TRS Address
const TRS_main_Address_VC1 = "0xa0c6859f3cef43be042d33e319f3929780f76a3138db1df9e492febd97943ea4"; //1.082M monthly release
const TRS_main_Address_VC2 = "0xa0c36bc123534371cae9c2f5abe10efde602a39b224baaad5fc0671a2a69a612"; //1.478M monthly release
const TRS_main_Address_Foundation = "0xa090b025a1489aa6c9204d7b85ac77d51b814402d5cbdec27335575bb46e4f20"; //Foundation address
const TRS_main_Address_Nuco_VC = "0xa0ab55628dc3afc34279d5a16fb4c7c5652ceea350d0efaa7d96eaaa42a4c211"; //Nuco address


//Nuco sub TRS Address, this address will send to 26 nuco VC address, check "https://mainnet.aion.network/#/account/0xa06ed7d1d192e3bb26e894e0b9e76ef052f2cf62fc6325bbaa54d88477dcadd9"

const TRS_sub_Address_Nuco_VC = "0xa06ed7d1d192e3bb26e894e0b9e76ef052f2cf62fc6325bbaa54d88477dcadd9";



traceTransactions(map,TRS_main_Address_VC1,binanceHotAddress).then(function(){
  console.log(depositStory);
  collectDepositeDetail(map,Object.keys(depositStory),binanceHotAddress).then(function(dumpStory){
    console.log(dumpStory);
    process.exit(0);
  });
});
