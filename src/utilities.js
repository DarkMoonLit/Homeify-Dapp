import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import homeifyAbi from "../contract/homeify.abi.json";
import erc20Abi from "../contract/erc20.abi.json";
import {
  ERC20_DECIMALS,
  HIContractAddress,
  cUSDContractAddress,
} from "./constants";

export async function approve(_price, _kit) {
  const cUSDContract = new _kit.web3.eth.Contract(
    erc20Abi,
    cUSDContractAddress
  );
  const result = await cUSDContract.methods
    .approve(HIContractAddress, _price)
    .send({ from: _kit.defaultAccount });
  return result;
}

export const getBalance = async function (_kit) {
  const totalBalance = await _kit.getTotalBalance(_kit.defaultAccount);
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
  document.querySelector("#balance").textContent = cUSDBalance;
};

export const getVotes = async function (_contract) {
  const votes = await _contract.methods.getVotes().call();
  document.querySelector("#current-votes").textContent = votes[0];
  document.querySelector("#max-vote").textContent = votes[1];
};

export const verifyLimit = function (
  _furnituresPerWallet,
  _currentLimitFurniture
) {
  // enables buy button if limit of furnitures per wallet has not been exceeded
  if (_furnituresPerWallet < _currentLimitFurniture) {
    document.querySelector("#create-btn").classList.remove("disabled");
    const buyButtons = document.querySelectorAll(".buy-Btn");
    buyButtons.forEach((button) => button.classList.remove("disabled"));
  } else {
    // disables buy buttons if limit of furnitures per wallet has been exceeded
    document.querySelector("#create-btn").classList.add("disabled");
    const buyButtons = document.querySelectorAll(".buy-Btn");
    buyButtons.forEach((button) => button.classList.add("disabled"));
  }
};

export function notification(_text) {
  document.querySelector(".alert").style.display = "block";
  document.querySelector("#notification").textContent = _text;
}

export function notificationOff() {
  document.querySelector(".alert").style.display = "none";
}

export const connectCeloWallet = async function () {
  if (window.celo) {
    notification("⚠️ Please approve this DApp to use it.");
    try {
      await window.celo.enable();
      notificationOff();
      const web3 = new Web3(window.celo);
      let _kit;
      let _contract;
      _kit = newKitFromWeb3(web3);
      const accounts = await _kit.web3.eth.getAccounts();
      _kit.defaultAccount = accounts[0];
      _contract = new _kit.web3.eth.Contract(homeifyAbi, HIContractAddress);
      return { _kit, _contract };
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.");
  }
};
