import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { github } from "../assets";

const ProjectModal = ({ project, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!project) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-tertiary rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white text-2xl w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center z-20 transition-colors"
          >
            &times;
          </button>

          {/* Video Section */}
          <div className="w-full aspect-video bg-black-100 rounded-t-2xl overflow-hidden">
            {project.videoUrl ? (
              <iframe
                src={project.videoUrl}
                title={`${project.name} video`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-secondary">
                <svg
                  className="w-16 h-16 mb-3 opacity-40"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <p className="text-sm opacity-60">Video coming soon</p>
              </div>
            )}
          </div>

          {/* Image Section */}
          <div className="px-6 pt-5">
            <div className="w-full h-[200px] bg-black-200 rounded-xl overflow-hidden flex items-center justify-center">
              {project.image ? (
                <img
                  src={project.image}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <p className="text-secondary text-sm opacity-60">Screenshot coming soon</p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h2 className="text-white font-bold text-[28px]">{project.name}</h2>

            <p className="mt-3 text-secondary text-[15px] leading-[26px]">
              {project.detailedDescription || project.description}
            </p>

            {/* Tech Stack */}
            {project.techStack && project.techStack.length > 0 && (
              <div className="mt-5">
                <h3 className="text-white font-semibold text-[16px] mb-3">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 bg-black-200 text-secondary text-[13px] rounded-full border border-white/10"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              {project.source_code_link && (
                <a
                  href={project.source_code_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-black-200 text-white rounded-xl hover:bg-black-100 transition-colors text-[14px]"
                >
                  <img src={github} alt="github" className="w-5 h-5" />
                  Source Code
                </a>
              )}
              {project.liveDemo && (
                <a
                  href={project.liveDemo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#915EFF] text-white rounded-xl hover:bg-[#7a4ee0] transition-colors text-[14px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Live Demo
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectModal;
