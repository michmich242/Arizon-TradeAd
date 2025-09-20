import config from "../config.json" with {type : 'json'};
import fs from "fs";
import {sleep} from "../Arizon-Ad.js"





export async function send_ad(){


    await check_offering_items();

    let body_send = {"player_id" : config.roblox_id, "offer_item_ids" : config.items_send, "request_item_ids" : config.items_request, "request_tags" : config.tags_send};

    
    if(config.robux_send > 0){
        body_send["offer_robux"] = config.robux_send;

    }
    


    const result = await fetch("https://api.rolimons.com/tradeads/v1/createad", {
        method: 'POST',
        headers: {
            "Content-Type" : "application/json",
            "Cookie" : "_RoliVerification=" + config.RoliVerification
        },
        body: JSON.stringify(body_send)
    });

    if(result.ok){
        console.log("Successfully sent a trade ad!");
    }
    else{
        console.log("Failed to send trade ad (Exceeded time limit?).");
    }

    console.log(result.status);

    const data = await result.json();
    console.log(data);

}


export async function check_offering_items(){
    let check_inventory = null;
    try{
        check_inventory = await fetch("https://inventory.roblox.com/v1/users/" + config.roblox_id + "/assets/collectibles?limit=100", {
            method : "GET",
            headers : {
                "Accept" : "application/json"
            }
        });
    }
    catch(err){
        console.log("Error with retrieving user limiteds, retrying in 5 seconds.");
        await sleep(5000);
        check_offering_items();
        return; 
    }

    let response = null

    try{
        response = await check_inventory.json();
    }
    catch(err){
        console.log("There has been an issue parsing the content type, retrying in 5 seconds: " + err);
        await sleep(5000);
        check_offering_items();
        return; 
    }

    for(let i = 0; i < (config.items_send).length; ++i){
        const id = config.items_send[i];

        let checker = 0;
        for(let j = 0; j < (response.data).length; ++j){
            if(Number(id) === Number(response.data[j].assetId)){
                checker = 1;
                break;
            }
        }


        if(checker == 0){
            console.log("Removing " + id + " (not in inventory).");
            config.items_send.splice(i, 1);
            --i;
        }


    }

    
    fs.writeFileSync("config.json", JSON.stringify(config, null, 5), "utf8");

}

