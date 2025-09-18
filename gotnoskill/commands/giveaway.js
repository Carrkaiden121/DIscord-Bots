
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('gcreate')
  .setDescription('Create a giveaway')
  .addStringOption(option =>
    option.setName('prize')
      .setDescription('The prize for the giveaway')
      .setRequired(true)
  )
  .addRoleOption(option =>
    option.setName('pingrole')
      .setDescription('Role to ping for the giveaway')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('duration')
      .setDescription('Duration of the giveaway (e.g., 1h, 30m)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const prize = interaction.options.getString('prize');
  const pingRole = interaction.options.getRole('pingrole');
  const duration = interaction.options.getString('duration');

  const embed = new EmbedBuilder()
    .setTitle('🎉 Giveaway Created!')
    .addFields(
      { name: 'Prize', value: prize, inline: true },
      { name: 'Duration', value: duration, inline: true },
      { name: 'Ping Role', value: `<@&${pingRole.id}>`, inline: true }
    )
    .setColor(0xFFD700)
    .setTimestamp();

  await interaction.reply({ content: `<@&${pingRole.id}>`, embeds: [embed] });
}

export default { data, execute };
