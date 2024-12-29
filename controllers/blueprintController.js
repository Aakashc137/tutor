import { Sequelize } from "sequelize";
import { Blueprint } from "../models/blueprint.js";

class BlueprintController {
  async getPaginatedBlueprints(req, res) {
    try {
      const { name, grade, subject, totalMarks, cursor, limit = 10 } = req.query;

      const where = {};
      if (name) where.name = name;
      if (grade) where.grade = grade;
      if (subject) where.subject = subject;
      if (totalMarks) where.totalMarks = totalMarks;
      if (cursor) {
        where.id = { [Sequelize.Op.lt]: cursor };
      }

      const blueprints = await Blueprint.findAll({
        where,
        order: [["id", "DESC"]],
        limit: parseInt(limit) + 1,
      });

      const hasNextPage = blueprints.length > limit;
      const resultBlueprints = hasNextPage ? blueprints.slice(0, limit) : blueprints;
      const nextCursor =
        resultBlueprints.length > 0
          ? resultBlueprints[resultBlueprints.length - 1].id
          : null;

      res.status(200).send({
        success: true,
        blueprints: resultBlueprints,
        hasNextPage,
        nextCursor: hasNextPage ? nextCursor : null,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ success: false, message: "Failed to fetch blueprints" });
    }
  }

  async createBlueprint(req, res) {
    try {
      const { blueprint } = req.body;

      if (!blueprint) {
        return res.status(400).send({
          success: false,
          message: "Blueprint data is required",
        });
      }

      const createdBlueprint = await Blueprint.create(blueprint);
      res.status(201).send({ success: true, blueprint: createdBlueprint });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ success: false, message: "Failed to create blueprint" });
    }
  }

  async updateBlueprint(req, res) {
    try {
      const { id, blueprint } = req.body;

      if (!id || !blueprint) {
        return res.status(400).send({
          success: false,
          message: "id and blueprint data are required",
        });
      }

      const existingBlueprint = await Blueprint.findByPk(id);
      if (!existingBlueprint) {
        return res.status(404).send({
          success: false,
          message: "Blueprint not found",
        });
      }

      await existingBlueprint.update(blueprint);
      res.status(200).send({ success: true, blueprint: existingBlueprint });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ success: false, message: "Failed to update blueprint" });
    }
  }
}

export const blueprintController = new BlueprintController();
