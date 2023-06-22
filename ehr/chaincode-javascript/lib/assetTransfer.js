/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

//added
const ClientIdentity = require('fabric-shim').ClientIdentity;

class AssetTransfer extends Contract {

    async InitLedger(ctx) {
        const assets = [
/*            {
                ID: '8e3dd2ea9ff3da70862a52621f7c1dc81c2b184cb886a324a3f430ec11efd3f2',
                record : { patient_id: 'p1',
                timestamp: '3/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'create',
                }
            },
            {
                ID: '75590fc11d5dd4acbbef0238cd7b82c0f4397ada0a914802e3261a6d49ae0f7e',
                record : { patient_id: 'p2',
                timestamp: '5/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'create',
                }
            },
            {
                ID: '0b785ba0e26118cba6e2e736c90d9e0bf4dfd03730382c897bb27bc93aaaa59b',
                record : { patient_id: 'p1',
                timestamp: '8/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'change',
                }
            },
            {
                ID: 'a946ed4f1f88da82f41acc96436c7bad82c202a08016c4a6b9a937783845af82',
                record : { patient_id: 'p3',
                timestamp: '8/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'print',
                }
            },
            {
                ID: '5a8df6aac8ebb7ebf5dfa49c1ae0b3a0a664683933f00eefe297bfdea5cec680',
                record : { patient_id: 'p4',
                timestamp: '8/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'delete',
                }
            },
            {
                ID: 'c35d1bc6172695b7130a5e301d89c5bab7b264d33b83308df0b0df586b821fa6',
                record : { patient_id: 'p5',
                timestamp: '8/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'copy',
                }
            }*/
        ];

        for (const asset of assets) {
            asset.docType = 'asset';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreateAsset(ctx, id, record_value) {
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }
	
		
        const asset = {
            ID: id,
            record: record_value
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }
    
    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
    
    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }
    
    // Get Modification history of asset.
    async GetModificationHistory(ctx, id) {
    	let iterator = await ctx.stub.getHistoryForKey(id);
	let result = [];
	let res = await iterator.next();
	while (!res.done) {
	      if (res.value) {
	        console.info(`found state update with value: ${res.value.value.toString('utf8')}`)
	        const obj = res.value.value.toString('utf8');//JSON.parse(res.value.value.toString('utf8'));
	        result.push(obj);
	      }
	      res = await iterator.next();
	}
	await iterator.close();
	return result;
    }
   
   // DeleteAsset deletes an given asset from the world state.
    async DeleteAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }
   
/*
    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    async UpdateAsset(ctx, id, color, size, owner, appraisedValue) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Color: color,
            Size: size,
            Owner: owner,
            AppraisedValue: appraisedValue,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    
    
    // TransferAsset updates the owner field of asset with given id in the world state.
    async TransferAsset(ctx, id, newOwner) {
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        const oldOwner = asset.Owner;
        asset.Owner = newOwner;
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldOwner;
    }
*/
    
}

module.exports = AssetTransfer;
