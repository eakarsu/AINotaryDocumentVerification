import AIReport from './AIReport'

export default function AIResultDisplay({ result, loading }) {
  return <AIReport response={result} loading={loading} title="AI analysis" />
}
