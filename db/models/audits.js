module.exports = (sequelize, DataTypes) => (
  sequelize.define('audits', {
    email: DataTypes.STRING,
    action: DataTypes.STRING,
    table: DataTypes.STRING,
    data: DataTypes.STRING,
  }, {
    freezeTableName: true,
    underscored: true,
  })
);
