import { Sequelize } from "sequelize";
import { User } from "../models/user.js";

class UserController {
  async updateUser(req, res) {
    try {
      const { id, name, emailId, tokens } = req.body;

      if (!id) {
        return res.status(400).send({ success: false, message: "ID_NOT_FOUND" });
      }

      if(id !== req.user.id) {
        return res.status(403).send({ success: false, message: "FORBIDDEN" });
      }

      const user = await User.findOne({ where: { id } });
      if (!user) {
        return res.status(404).send({ success: false, message: "USER_NOT_FOUND" });
      }

      const updatePayload = {};
      if (name) updatePayload.name = name.trim();
      if (emailId) {
        updatePayload.emailId = emailId.trim();

        const existingUser = await User.findOne({
          where: {
            emailId: emailId.trim(),
            id: { [Sequelize.Op.ne]: id },
          },
        });

        if (existingUser) {
          return res.status(400).send({
            success: false,
            message: "EMAILID_ALREADY_REGISTERED",
          });
        }
      }
      if (tokens !== undefined) updatePayload.tokens = tokens;

      if (Object.keys(updatePayload).length === 0) {
        return res.status(400).send({
          success: false,
          message: "Figure out what you want to update first",
        });
      }

      await user.update(updatePayload);

      res.status(200).send({
        success: true,
        message: "User updated successfully",
        user: {
          id: user.id,
          name: user.name,
          emailId: user.emailId,
          tokens: user.tokens,
          mobileNumber: user.mobileNumber
        },
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send({ success: false, message: "Failed to update user" });
    }
  }
}

export const userController = new UserController();