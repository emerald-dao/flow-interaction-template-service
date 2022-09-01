import * as fcl from "@onflow/fcl";
import { Template } from "../models/template";
import { readFiles } from "../utils/read-files";
import { genHash } from "../utils/gen-hash";

class TemplateService {
  config: any;

  constructor(config: any) {
    this.config = config;
  }

  async insertTemplate(template: string) {
    let newTemplate: Template;

    let templateJSON = JSON.parse(template);

    newTemplate = await Template.query().insertAndFetch({
      id: templateJSON.id,
      json_string: template,
    });

    return newTemplate;
  }

  async getTemplate(templateId: string) {
    let foundTemplate: Template;

    foundTemplate = (
      await Template.query().where({
        id: templateId,
      })
    )[0];

    let foundTemplateJson = foundTemplate?.json_string || null;

    if (typeof foundTemplateJson === "string") {
      foundTemplateJson = JSON.parse(foundTemplateJson);
    }

    return foundTemplateJson;
  }

  async getTemplateByCadence(cadenceHash: string, network: string) {
    let foundTemplate: Template | null = null;

    if (network === "mainnet") {
      foundTemplate = (
        await Template.query().where({
          mainnet_cadence_sha3_256_hash: cadenceHash,
        })
      )[0];
    } else if (network === "testnet") {
      foundTemplate = (
        await Template.query().where({
          testnet_cadence_sha3_256_hash: cadenceHash,
        })
      )[0];
    }

    let foundTemplateJson = foundTemplate?.json_string || null;

    if (typeof foundTemplateJson === "string") {
      foundTemplateJson = JSON.parse(foundTemplateJson);
    }

    return foundTemplateJson;
  }

  async seed() {
    const templates = await readFiles(this.config.templateDir);

    await Template.query().del();

    for (let template of templates) {
      try {
        let parsedTemplate = JSON.parse(template.content);

        let mainnet_cadence =
          fcl.InteractionTemplateUtils.deriveCadenceByNetwork({
            template: parsedTemplate,
            network: "mainnet",
          });

        let testnet_cadence =
          fcl.InteractionTemplateUtils.deriveCadenceByNetwork({
            template: parsedTemplate,
            network: "testnet",
          });

        const recomputedTemplateID =
          await fcl.InteractionTemplateUtils.generateTemplateId({
            template: parsedTemplate,
          });
        if (recomputedTemplateID !== parsedTemplate.id)
          throw new Error(
            `recomputed=${recomputedTemplateID} template=${parsedTemplate.id}`
          );

        await Template.query().insertAndFetch({
          id: parsedTemplate.id,
          json_string: template.content,
          mainnet_cadence_sha3_256_hash: await genHash(mainnet_cadence),
          testnet_cadence_sha3_256_hash: await genHash(testnet_cadence),
        });
      } catch (e) {
        console.warn(`Skipping template ${template.path} error=${e}`);
      }
    }
  }
}

export { TemplateService };
