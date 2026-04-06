import React from "react";
import { motion } from "framer-motion";

import { SectionWrapper } from "../hoc";
import { tools } from "../constants";
import { styles } from "../styles";
import { fadeIn, textVariant } from "../utils/motion";

const Tools = () => {
  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>What I work with</p>
        <h3 className={styles.sectionHeadText}>Tools & Platforms.</h3>
      </motion.div>

      <div className="mt-10 flex flex-wrap gap-6">
        {tools.map((group, groupIndex) => (
          <motion.div
            key={group.category}
            variants={fadeIn("up", "spring", groupIndex * 0.15, 0.75)}
            className="bg-tertiary rounded-2xl p-5 min-w-[250px] flex-1"
          >
            <h4 className="text-white font-semibold text-[16px] mb-3">
              {group.category}
            </h4>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 bg-black-200 text-secondary text-[13px] rounded-full border border-white/10 hover:border-[#915EFF]/50 transition-colors"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Tools, "");
