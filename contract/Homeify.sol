// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}


contract Homeify {

    uint furnitures  = 0;
    address payable owner;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    uint sold = 0;
    uint salesFee = 1000000000000000000;

    event Sale(address indexed from, address indexed to, uint256 value);

    uint votes = 0;
    uint maxVotes = 5;
    uint votingEvent = 0; // users are limited to one vote per event
     // Voting fee
    uint feeToVote = 1000000000000000000;
    mapping(address => uint) votesPerWallet;


    uint currentLimitFurniture = 2;
    mapping(address => uint) furnituresPerWallet;
    mapping(uint => Furniture) totalFurnitures;

    mapping(uint => uint) sellingCount; // total count of reselling a furniture
    mapping(uint => uint) dateOfSale;

    struct Furniture {
        address payable owner;
        string name;
        string image;
        string description;
        string dimension;
        uint price;
        bool forSale;

    }

    constructor(){
      owner = payable(msg.sender);
    }


    function createFurniture(string memory _name, string memory _image, string memory _description, string memory _dimension, uint _price) public {
      require(_price >= 1000000000000000000, "Furnitures can't be listed as free");
      require(furnituresPerWallet[msg.sender] < 2, "Exceeded limit of furnitures");
      totalFurnitures[furnitures] = Furniture(payable(msg.sender), _name, _image, _description, _dimension, _price, true);
      dateOfSale[furnitures] = 1 + furnitures;
      furnitures++;
      furnituresPerWallet[msg.sender]++;
    }


    // toggling of sales on furnitures
    function setForSale(uint _id) public {
      require(totalFurnitures[_id].owner == msg.sender, "You can't perform this action");
      totalFurnitures[_id].forSale =  !totalFurnitures[_id].forSale;
    }


    // sell furniture and a sales fee is paid to contract owner
    function sellFurniture(uint _id) public payable {
      require(totalFurnitures[_id].owner != msg.sender, "Not a customer");
      require(furnituresPerWallet[msg.sender]< 2, "Limit exceeded for furnitures owned");
      require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            totalFurnitures[_id].owner,
            totalFurnitures[_id].price
          ),
          "Transfer failed for buying."
        );
        require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            owner,
            salesFee
          ),
          "Transfer failed for salesFee."
        );
        sold++;
        sellingCount[_id]++;
        furnituresPerWallet[totalFurnitures[_id].owner]--;
        furnituresPerWallet[msg.sender]++;
        dateOfSale[_id] = block.timestamp;

        emit Sale(totalFurnitures[_id].owner, msg.sender, totalFurnitures[_id].price); // event emitted to log Sale onto the blockchain
        totalFurnitures[_id].owner = payable(msg.sender);
        totalFurnitures[_id].forSale = false;
    }


    //  vote on current Voting Event after paying a fee
    function vote() public payable {
      // ensures users vote once per votingEvent
      while(votesPerWallet[msg.sender] < votingEvent){
        votesPerWallet[msg.sender]++;
      }
      require(votesPerWallet[msg.sender] == votingEvent, "You already voted");
      require(votes <= maxVotes, "Limit for voting has already been reached");
      require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            owner,
            feeToVote
          ),
          "Transfer failed for voting."
        );
      votesPerWallet[msg.sender]++;
      votes++;
      // limiter set to prevent maxVotes
      if(votes == maxVotes && maxVotes < 20){
        votes = 0;
        maxVotes += 5;
        votingEvent++;
        currentLimitFurniture++;
      }
      // runs only after maxVotes has reached 20
      if (votes == maxVotes){
        votes = 0;
        votingEvent++;
        currentLimitFurniture++;
      }
    }



    function sortItems(string memory _option) public view returns (uint[] memory _filteredArray) {
      string memory dateOption = "dateOfSale";
      string memory sellOption = "sellingCount";
       // strings are hashed for comparison
      if(keccak256(abi.encodePacked(_option)) == keccak256(abi.encodePacked(dateOption))){
        uint[] memory dates = new uint[](furnitures);
        //for loop to retrieve individual data
        for(uint i = 0; i < furnitures;i++){
          dates[i] = dateOfSale[i];
        }
        return dates; //respective array is returned
      }
       // strings are hashed for comparison
      if(keccak256(abi.encodePacked(_option)) == keccak256(abi.encodePacked(sellOption))){
        uint[] memory counts = new uint[](furnitures);
        //for loop to retrieve individual data
        for(uint i = 0; i < furnitures;i++){
          counts[i] = sellingCount[i];
        }

        return counts; //respective array is returned
      }
    }

    function getFeeToVote() public view returns (uint) {
      return feeToVote;
    }

    function getSalesFee() public view returns (uint) {
      return salesFee;
    }

    function getVotes() public view returns (uint, uint) {
      return (votes, maxVotes);
    }

    function getVotingEvents() public view returns(uint, uint) {
      return (votingEvent, votesPerWallet[msg.sender]);
    }

    function getSold() public view returns (uint) {
      return sold;
    }

    function getFurniture(uint _id) public view returns
    (address payable, string memory, string memory, string memory, string memory, uint, bool ){
      return (
        totalFurnitures[_id].owner,
        totalFurnitures[_id].name,
        totalFurnitures[_id].image,
        totalFurnitures[_id].description,
        totalFurnitures[_id].dimension,
        totalFurnitures[_id].price,
        totalFurnitures[_id].forSale
      );
    }

    function getFurnituresLength() public view returns (uint) {
      return furnitures;
    }

    function getCurrentLimitFurniture() public view returns (uint, uint) {
      return (currentLimitFurniture, furnituresPerWallet[msg.sender]);
    }



}
