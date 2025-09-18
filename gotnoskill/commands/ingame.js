
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ingame')
  .setDescription('Get in-game info')
  .addSubcommand(sub => sub.setName('info').setDescription('Get in-game information'));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const embed = new EmbedBuilder()
    .setTitle('In-Game Info')
    .setDescription('Coming soon...');
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
