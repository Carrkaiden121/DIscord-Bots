import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('api')
  .setDescription('API system commands')
  .addSubcommand(sub => sub.setName('status').setDescription('Check API status'));

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('API System')
    .setDescription('Coming soon...');
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
