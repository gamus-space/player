'use strict';

export const invalidSongs = [
	"UnExoticA/Turrican_2/mdat.world_1.zip#31",
	"UnExoticA/Turrican_2/Unused/mdat.world_1.zip#31",
	"UnExoticA/Turrican_2/mdat.world_3.zip#31",
	"UnExoticA/Turrican_2/mdat.world_4.zip#31",
	"UnExoticA/Turrican_3/mdat.world_3.zip#10",
	"UnExoticA/Turrican/mdat.ingame_1.zip#6",
	"UnExoticA/Turrican/mdat.ingame_2.zip#4",
	"UnExoticA/Turrican/mdat.ingame_3.zip#3",
	"UnExoticA/Turrican/mdat.ingame_4.zip#9",
	"UnExoticA/Turrican/mdat.ingame_5.zip#6",
	"UnExoticA/Turrican/mdat.title.zip#4",
	"UnExoticA/Turrican/mdat.title.zip#5",
	"UnExoticA/Apidya/mdat.title.zip#2",
	"UnExoticA/Monkey_Island/mdat.Monkey_Island.zip#17",
	"UnExoticA/Monkey_Island/mdat.Monkey_Island.zip#18",
	"UnExoticA/Monkey_Island/mdat.Monkey_Island.zip#19",
	"UnExoticA/Monkey_Island/mdat.Monkey_Island.zip#20",
	"UnExoticA/Agony/Unused/mod.foret#30",
	"UnExoticA/Project-X/mod.px.bladswede remix!#37",
	"UnExoticA/Pinball_Dreams/di.steelwheels#45",
	"UnExoticA/Pinball_Dreams/di.steelwheels#52",
	"UnExoticA/Pinball_Dreams/di.steelwheels#60",
	"World of Game MODs/PC/Death Rally/MENUTUNE.S3M#41",
	"World of Game MODs/PC/Death Rally/MENUTUNE.S3M#46",
	"World of Game MODs/PC/Pinball Dreams 2/LEVEL1 - Neptune Table - original.mod#4",
	"World of Game MODs/PC/Pinball Dreams 2/LEVEL1 - Neptune Table - original.mod#15",
	"World of Game MODs/PC/Pinball Dreams 2/LEVEL1 - Neptune Table - original.mod#23",
	"World of Game MODs/PC/Pinball Dreams 2/LEVEL1 - Neptune Table - original.mod#33",
	"World of Game MODs/PC/Pinball Dreams 2/LEVEL1.MOD#1",
	"World of Game MODs/PC/Pinball Dreams 2/LEVEL2.MOD#25",
	"World of Game MODs/PC/Pinball Dreams 2/LEVEL4.MOD#36",
	"VGMPF/PC/Blackthorne/01.xmi",
	"VGMPF/PC/Blackthorne/02.xmi",
	"VGMPF/PC/Dune II/DUNE1.ADL#3",
	"VGMPF/PC/Raptor Call of the Shadows/15 - Boss 1.mus#140",
	"resources/OPL3/Polanie/muzyka09.s3m",
	"resources/OPL3/Polanie/muzyka10.s3m",
	"resources/OPL3/Polanie/muzyka15.s3m",
];

const issues = [
	{ name: "TFMX issues", groups: [
		{ name: "SID not supported", songs: [
			"UnExoticA/Turrican_2/mdat.loader.zip",
			"UnExoticA/Turrican_2/Unfixed_Loader/mdat.loader.zip",
			"UnExoticA/Turrican_3/mdat.loader.zip#1",
			"UnExoticA/Turrican_3/mdat.loader.zip#2",
			"UnExoticA/Turrican_3/mdat.loader.zip#3",
		] },
		{ name: "sample", songs: [
			"UnExoticA/Turrican/mdat.ingame_4.zip#7",
		] },
		{ name: "instant end", songs: [
			"UnExoticA/Apidya/mdat.ingame_5.zip#2",
		] },
	]},
	{ name: "invalid song", groups: [
		{ name: "clipped", songs: [
			"UnExoticA/Superfrog/p4x.intro_tune_5",
		] },
		{ name: "bad sample", songs: [
			"World of Game MODs/PC/Crusader No Remorse/M07.MOD#1",
			"World of Game MODs/PC/Crusader No Remorse/M07.MOD#18",
		] },
		{ name: "bad tempo change", songs: [
			"UnExoticA/Settlers/mod.siedler ii",
		] },
	]},
	{ name: "OPL3 issues", groups: [
		{ name: "MUS bad sample", songs: [
			"VGMPF/PC/Doom II Hell On Earth/10 - The Dave D. Taylor Blues.mus",
			"VGMPF/PC/Doom II Hell On Earth/17 - Getting Too Tense.mus",
			"VGMPF/PC/Final Doom - The Plutonia Experiment/DDTBL3.MUS",
			"VGMPF/PC/Final Doom - TNT Evilution/THEDA2.MUS",
		] },
		{ name: "XMI inaccurate percussion", songs: [
			"VGMPF/PC/Lost Vikings, The/505.xmi",
			"VGMPF/PC/Lost Vikings, The/506.xmi",
		] },
		{ name: "XMI missing voices", songs: [
			"resources/OPL3/Mega Man X/POWER.XMI",
			"resources/OPL3/Super Street Fighter II/S_VEGA.XMI",
		] },
		{ name: "MID invalid timing", songs: [
			"VGMPF/PC/Duke Nukem 3D/15 - Aliens, Say Your Prayers!.mid",
		] },
		{ name: "MID using AdLib instruments", songs: [
			"resources/OPL3/Chips Challenge/CANYON.MID",
			"resources/OPL3/Chips Challenge/CHIP01.MID",
			"resources/OPL3/Chips Challenge/CHIP02.MID",
			"resources/OPL3/Windows 95/CANYON.MID",
			"resources/OPL3/Windows 95/PASSPORT.MID",
		] },
		{ name: "KLM volume problem", songs: [
			"VGMPF/PC/Wacky Wheels/02 - Main Menu.klm",
			"VGMPF/PC/Wacky Wheels/03 - Ashes.klm",
		] },
		{ name: "HMP invalid effect", songs: [
			"resources/OPL3/Super Street Fighter II Turbo/INTRO_F.HMP",
		] },
		{ name: "HMP invalid instruments", songs: [
			"VGMPF/PC/Theme Park/INTRO.HMP",
			"VGMPF/PC/Theme Park/INTRO2.HMP",
			"VGMPF/PC/Theme Park/INTRO3.HMP",
			"VGMPF/PC/Theme Park/INTRO4.HMP",
			"VGMPF/PC/Theme Park/INTRO5.HMP",
		] },
		{ name: "HMI excessive instruments", songs: [
			"resources/OPL3/Battle Arena Toshinden/EIJI-AMIDI.HMI",
		] },
		{ name: "ADL (Coktel Vision) wrong percussion instrument", songs: [
			"VGMPF/PC/Lost in Time/DORA10.ADL",
			"VGMPF/PC/Lost in Time/DORA11.ADL",
			"VGMPF/PC/Lost in Time/DORA15.ADL",
			"VGMPF/PC/Lost in Time/DORA16.ADL",
			"VGMPF/PC/Lost in Time/DORA18.ADL",
			"VGMPF/PC/Lost in Time/DORA2.ADL",
		] },
	]},
	{ name: "AdPlug issues", groups: [
		{ name: "lock up", songs: [
			"resources/OPL3/Polanie/muzyka07.s3m",
			"resources/OPL3/Polanie/muzyka08.s3m",
		] },
		{ name: "ADL (Westwood) song too long", songs: [
			"VGMPF/PC/Dune II/DUNE16.ADL#8",
			"VGMPF/PC/Dune II/DUNE17.ADL#5",
			"VGMPF/PC/Dune II/DUNE7.ADL#3",
			"VGMPF/PC/Dune II/DUNE7.ADL#4",
			"VGMPF/PC/Dune II/DUNE7.ADL#5",
			"VGMPF/PC/Dune II/DUNE7.ADL#7",
			"VGMPF/PC/Dune II/DUNE8.ADL#3",
			"VGMPF/PC/Dune II/DUNE8.ADL#4",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra1a.adl#3",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra1a.adl#4",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra1a.adl#5",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra1b.adl#3",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra1b.adl#5",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra1b.adl#9",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra2a.adl#3",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra2a.adl#4",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra2a.adl#6",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra2a.adl#8",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra3a.adl#4",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra3a.adl#5",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra4a.adl#3",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra4a.adl#4",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra4a.adl#8",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra4a.adl#9",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyra5b.adl#6",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyramisc.adl#3",
			"VGMPF/PC/The Legend of Kyrandia Book One/kyramisc.adl#4",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2FINALE.ADL#4",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2INTRO.ADL#6",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2INTRO.ADL#7",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST1.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST1.ADL#4",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST10.ADL#5",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST10.ADL#6",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST10.ADL#10",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST11.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST11.ADL#6",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST11.ADL#7",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST11.ADL#8",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST12.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST12.ADL#4",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST12.ADL#5",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST12.ADL#7",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST12.ADL#10",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST13.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST13.ADL#7",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST13.ADL#9",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST14.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST15.ADL#5",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST2.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST2.ADL#4",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST3.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST3.ADL#4",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST4.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST4.ADL#4",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST5.ADL#7",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST5.ADL#8",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST6.ADL#4",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST6.ADL#5",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST7.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST7.ADL#4",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST7.ADL#6",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST8.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST8.ADL#6",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST8.ADL#8",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST8.ADL#10",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST9.ADL#3",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST9.ADL#5",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST9.ADL#6",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST9.ADL#8",
			"VGMPF/PC/The Legend of Kyrandia Book Two - The Hand of Fate/K2TEST9.ADL#9",
		] },
		{ name: "MDI invalid speed", songs: [
			"VGMPF/PC/Golden Axe/INTRO.MDI",
			"VGMPF/PC/Golden Axe/INTRO2.MDI",
			"VGMPF/PC/Golden Axe/OLDMAP.MDI",
			"VGMPF/PC/Golden Axe/RD4.MDI",
		] },
		{ name: "MDI samples missing", songs: [
			"resources/OPL3/Lure of the Temptress/disk1.vga_001.mdi",
			"resources/OPL3/Lure of the Temptress/disk1.vga_002.mdi",
			"resources/OPL3/Lure of the Temptress/disk1.vga_003.mdi",
			"resources/OPL3/Lure of the Temptress/disk1.vga_004.mdi",
			"resources/OPL3/Lure of the Temptress/disk1.vga_068.mdi",
			"resources/OPL3/Lure of the Temptress/disk1.vga_069.mdi",
			"resources/OPL3/Lure of the Temptress/disk4.vga_007.mdi",
		] },
		{ name: "CMF song too long", songs: [
			"resources/OPL3/Alien Breed/ALARMED.CMF",
			"resources/OPL3/Alien Breed/INGAME.CMF",
			"resources/OPL3/Alien Breed/INTEX.CMF",
			"resources/OPL3/Alien Breed/MONSTER.CMF",
			"resources/OPL3/Alien Breed/TITLE.CMF",
		] },
		{ name: "SDB/AGD song too long", songs: [
			"VGMPF/PC/Dune/MORNING.AGD",
			"VGMPF/PC/Dune/MORNING.SDB",
			"VGMPF/PC/KGB/MACHINE.SDB",
		] },
		{ name: "SDB/AGD invalid effect", songs: [
			"VGMPF/PC/Dune/WORMINTR.AGD",
		] },
	]},
];

export const songIssues = issues
	.map(issue => issue.groups.map(group => group.songs.map(song => ({ song, group: group.name, issue: issue.name }))).reduce((a, e) => [...a, ...e], []))
	.reduce((a, e) => [...a, ...e], [])
	.map(({ song, group, issue }) => [song, `${issue} - ${group}`])
	.reduce((res, [song, issue]) => ({ ...res, [song]: [...res[song] || [], issue] }), {});
