import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('feedback')
  .setDescription('Submit feedback for a staff member')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The staff member to give feedback about')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('rating')
      .setDescription('Rating (1-5)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(5)
  )
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for the feedback')
      .setRequired(true)
  );

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const rating = interaction.options.getInteger('rating');
  const reason = interaction.options.getString('reason');

  // Optionally, check if the user has a staff role here

  const embed = new EmbedBuilder()
    .setTitle('Staff Feedback Submitted')
    .addFields(
      { name: 'Staff Member', value: `<@${user.id}>`, inline: true },
      { name: 'Rating', value: `${rating}/5`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setColor(0x00BFFF)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
