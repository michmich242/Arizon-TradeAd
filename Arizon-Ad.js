import config from "./config.json" with {type : "json"};
import "dotenv/config";
import fs from "fs";
import { send_inbound_setup, buildTradeImg, retrieve_IDValues, send_inbound, prev_date } from "./Arizon-Libs/Arizon-Inbound.js";
import { send_ad } from "./Arizon-Libs/Arizon-SendAd.js";






async function run_send_inbound(){

    while(true){
        await send_inbound();
        await sleep(20000);
    }
}



async function run_retrieve_IDValues(){
    while(true){
        await retrieve_IDValues();
        await sleep(300000);
    }

}






async function check_roli_exists(){
    const result = await fetch("https://rolimons.com");

    if(result.status == 200){
        console.log("Rolimons is up!");
        return true;
    }
    else{
        console.log("Rolimons is down.");
        return false;
    }

}


export function sleep(ms){
    let Wait = new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });

    return Wait;
}






async function run_send_ad(){
    while(true){
        
        await send_ad();
        await sleep(1080000);


    }
}


async function main(){



    if(!fs.existsSync("storage")){
        fs.mkdirSync("storage", {recursive : true});
    }

    if(!fs.existsSync("storage/Recent_T_ID.txt")){
        fs.writeFileSync("storage/Recent_T_ID.txt", "", "utf8");
    }
    else{
        const date = fs.readFileSync("storage/Recent_T_ID.txt", "utf8").trim();
        prev_date.value = date;
        
    }



    if(!(await check_roli_exists())){
        return;
    }


    run_send_ad();


    if(config.Trade_Inbounds == true){
        run_retrieve_IDValues();

        run_send_inbound();
    }




}



main();
