/* =======================
    Imports

*/
import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import homeifyAbi from "../contract/homeify.abi.json";
import erc20Abi from "../contract/erc20.abi.json";
import {
  ERC20_DECIMALS,
  HIContractAddress,
  cUSDContractAddress,
} from "./constants";
import {
  notification,
  notificationOff,
  connectCeloWallet,
  approve,
  getBalance,
  getVotes,
  verifyLimit,
} from "./utilities";
import { productTemplate, renderProducts } from "./products";

/* =======================
    end of imports

*/

/* =======================
    Utility variables

*/

let kit;
let contract;
let currentLimitFurniture;
let furnituresPerWallet;
let products = [];

/* =======================
    End of utility variables

*/

/* =======================
    Local utility functions

*/

const getCurrentLimitFurniture = async function () {
  const result = await contract.methods.getCurrentLimitFurniture().call();
  // current limit of ownership of wallet
  currentLimitFurniture = result[0];
  // furniture count of wallet
  furnituresPerWallet = result[1];
};

const getProducts = async function () {
  const _productsLength = await contract.methods.getFurnituresLength().call();
  const _products = [];
  for (let i = 0; i < _productsLength; i++) {
    let _product = new Promise(async (resolve, reject) => {
      let p = await contract.methods.getFurniture(i).call();
      resolve({
        index: i,
        owner: p[0],
        name: p[1],
        image: p[2],
        description: p[3],
        dimension: p[4],
        price: new BigNumber(p[5]),
        forSale: p[6],
      });
    });
    _products.push(_product);
  }
  products = await Promise.all(_products);
  renderProducts(products, kit);
};

/* =======================
    End of local utility functions

*/

/* =======================
   Event handlers

*/

window.addEventListener("load", async () => {
  notification("⌛ Loading...");
  const { _kit, _contract } = await connectCeloWallet(); //  object containing kit and contract is returned
  kit = _kit;
  contract = _contract;
  await getBalance(kit);
  await getCurrentLimitFurniture();
  await getProducts();
  await getVotes(contract);
  verifyLimit(furnituresPerWallet, currentLimitFurniture);
  notificationOff();
});

document
  .querySelector("#newProductBtn")
  .addEventListener("click", async (e) => {
    const params = [
      document.getElementById("newProductName").value,
      document.getElementById("newImgUrl").value,
      document.getElementById("newProductDescription").value,
      document.getElementById("newDimension").value,
      new BigNumber(document.getElementById("newPrice").value)
        .shiftedBy(ERC20_DECIMALS)
        .toString(),
    ];
    // ensures every input field has been filled
    if (params.length !== 5) {
      notification(`Please fill out the form correctly`);
      return;
    }
    notification(`⌛ Adding "${params[0]}"...`);
    try {
      const result = await contract.methods
        .createFurniture(...params)
        .send({ from: kit.defaultAccount });
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    notification(`🎉 You successfully added "${params[0]}".`);

    getProducts();
    getCurrentLimitFurniture();
    verifyLimit(furnituresPerWallet, currentLimitFurniture);
  });

document.querySelector("#marketplace").addEventListener("click", async (e) => {
  if (e.target.className.includes("buy-Btn")) {
    const index = e.target.id;
    const salesFee = new BigNumber(await contract.methods.getSalesFee().call());
    notification(
      `⌛ Waiting for payment approval for ${salesFee
        .shiftedBy(-ERC20_DECIMALS)
        .toFixed(2)} cUSD...`
    );
    try {
      const total = salesFee + products[index].price; // ensures fee paid to contract owner is also approved
      await approve(total, kit);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    notification(`⌛ Awaiting payment for "${products[index].name}"...`);
    try {
      const result = await contract.methods
        .sellFurniture(index)
        .send({ from: kit.defaultAccount });
      notification(`🎉 You successfully bought "${products[index].name}".`);
      getProducts();
      getBalance(kit);
      getCurrentLimitFurniture();
      verifyLimit(furnituresPerWallet, currentLimitFurniture);
      const sold = await contract.methods.getSold().call();
      notification(`🎉 ${sold} furnitures has been sold so far!`);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }
  if (e.target.className.includes("setForSale-btn")) {
    const index = e.target.id;
    notification(
      `Changing Sale status of ${products[index].name}, please wait`
    );

    try {
      await contract.methods
        .setForSale(index)
        .send({ from: kit.defaultAccount });
      getProducts();
      notification(
        `You successfully  changed the sale status to ${
          products[index].forSale ? "on sale" : "Not available"
        }`
      );
    } catch (e) {
      notification(`${e}`);
    }
  }
});

// Reminder to user of how many furnitures they currently possess
document.querySelector("#create-btn").addEventListener("click", (e) => {
  notification(
    `You currently own ${furnituresPerWallet} furnitures, limit is ${currentLimitFurniture}`
  );
});

// filter by date event handler
document.querySelector("#sort-date").addEventListener("click", async (e) => {
  document.getElementById("marketplace").innerHTML = "";
  notification("Awaiting filtering of products by date of sale, please wait");
  const dates = await contract.methods.sortItems("dateOfSale").call(); // array of dateOfSale is returned
  // assigns date to its respective product
  for (let i = 0; i < products.length; i++) {
    const result = products.findIndex((product) => product.index == i);
    products[result].date = dates[i];
  }
  // products array is rearranged by latest dateOfSale
  products.sort((a, b) => b.date - a.date);
  notification("Successfully rearranged products by date of sale");
  renderProducts(products, kit);
});

// filter by times sold event handler
document.querySelector("#sort-sales").addEventListener("click", async (e) => {
  document.getElementById("marketplace").innerHTML = "";
  notification("Awaiting filtering of products by sales count, please wait");
  const salesCount = await contract.methods.sortItems("sellingCount").call(); // array of times sold is returned
  // assigns timesSold to its respective product
  for (let i = 0; i < products.length; i++) {
    const result = products.findIndex((product) => product.index == i);
    products[result].salesCount = salesCount[i];
  }
  products.sort((a, b) => b.salesCount - a.salesCount);
  renderProducts(products, kit);
  notification("Successfully rearranged products by sales count");
});

document.querySelector("#vote-btn").addEventListener("click", async (e) => {
  const votingData = await contract.methods.getVotes().call(); // votes count, max votes count are returned
  const votingEvent = await contract.methods.getVotingEvents().call(); // votingEvent, user votes count are returned
  // ensures users vote once per votingEvent
  if (votingData[0] < votingData[1] && votingEvent[1] <= votingEvent[0]) {
    notification("Awaiting approval for voting fee");
    try {
      const feeToVote = new BigNumber(
        await contract.methods.getFeeToVote().call()
      );
      await approve(feeToVote, kit);
    } catch (e) {
      notification(`${e}`);
    }
    notification("Awaiting approval for voting");
    try {
      await contract.methods.vote().send({ from: kit.defaultAccount });
    } catch (e) {
      notification(`${e}`);
    }
    notification("Successfully voted!");
    getVotes(contract);
    getBalance(kit);
  } else {
    notification("Already voted");
  }
});

/* =======================
   End of event handlers

*/
