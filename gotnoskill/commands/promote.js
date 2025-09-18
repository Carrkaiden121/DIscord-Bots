
// ...existing code...
// ...existing code...

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('promote')
  .setDescription('Promote a user to a new rank')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to promote')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('newrank')
      .setDescription('The new rank for the user')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for promotion')
      .setRequired(true)
  );

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const newRank = interaction.options.getString('newrank');
  const reason = interaction.options.getString('reason');

  const embed = new EmbedBuilder()
    .setTitle('User Promoted')
    .addFields(
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'New Rank', value: newRank, inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setColor(0x00FF00)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
